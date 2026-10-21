package com.qlc.api.services;

import com.qlc.shared.monitoring.SubmissionMetrics;
import com.qlc.shared.model.entities.Submission;
import com.qlc.shared.model.enums.SubmissionStatus;
import com.qlc.shared.repositories.SubmissionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;

/** Database-owned recovery; only the API process schedules it. */
@Service
@Transactional
public class SubmissionRecoveryService {
  private static final Logger log = LoggerFactory.getLogger(SubmissionRecoveryService.class);
  private final SubmissionRepository submissionRepository;
  private final RedisQueueService redisQueueService;
  private final SubmissionMetrics metrics;

  @Value("${app.submissions.recovery.execution-timeout-ms:900000}")
  private long executionTimeoutMs = 900000;

  public SubmissionRecoveryService(SubmissionRepository submissionRepository,
      RedisQueueService redisQueueService, SubmissionMetrics metrics) {
    this.submissionRepository = submissionRepository;
    this.redisQueueService = redisQueueService;
    this.metrics = metrics;
  }

  public void recoverStuckSubmissions() {
    LocalDateTime now = LocalDateTime.now();
    if (executionTimeoutMs <= 0) throw new IllegalStateException("Execution recovery timeout must be positive");
    LocalDateTime cutoff = now.minus(java.time.Duration.ofMillis(executionTimeoutMs));
    for (UUID id : submissionRepository.findExpiredExecutionIds(cutoff, PageRequest.of(0, 50))) {
      Submission submission = submissionRepository.findByIdForUpdate(id).orElse(null);
      if (submission == null) continue;
      LocalDateTime started = submission.getStartedAt() == null ? submission.getCreatedAt() : submission.getStartedAt();
      if ((submission.getStatus() == SubmissionStatus.COMPILING || submission.getStatus() == SubmissionStatus.RUNNING)
          && started.isBefore(cutoff)) {
        submission.setStatus(SubmissionStatus.QUEUED);
        submission.setStartedAt(null);
        submission.setExecutionToken(null);
        submission.setQueuedAt(null);
        submissionRepository.save(submission);
        metrics.retryAfterCommit(submission.getLanguage(), "stale_execution");
      }
    }

    List<Submission> queued = submissionRepository.findQueuedForRecovery(now.minusSeconds(10), PageRequest.of(0, 50));
    // Move this batch to the end of the scan even when Redis is unavailable.
    // Otherwise the first 50 entries can starve the rest of a large backlog.
    for (Submission submission : queued) {
      submission.setQueuedAt(now);
      submissionRepository.save(submission);
    }
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
        @Override
        public void afterCommit() {
          republish(queued);
        }
      });
    } else {
      republish(queued);
    }
  }

  private void republish(List<Submission> submissions) {
    for (Submission submission : submissions) {
      try {
        redisQueueService.pushToStream(submission);
      } catch (Exception exception) {
        log.warn("Failed to recover submissionId={}; the next recovery run will retry it", submission.getId(), exception);
        return;
      }
    }
  }

}
