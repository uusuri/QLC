package com.qlc.services;

import com.qlc.models.entities.CodeTask;
import com.qlc.models.entities.Submission;
import com.qlc.models.entities.Task;
import com.qlc.models.enums.SubmissionStatus;
import com.qlc.models.messages.SubmissionStreamMessage;
import com.qlc.repositories.SubmissionRepository;
import com.qlc.runners.DockerRunnerResult;
import com.qlc.runners.RunRequest;
import com.qlc.runners.Toolchain;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@Service
public class SubmissionExecutionTransactions {

  private static final int MAX_EXECUTION_ATTEMPTS = 3;

  private final SubmissionRepository submissionRepository;

  public SubmissionExecutionTransactions(SubmissionRepository submissionRepository) {
    this.submissionRepository = submissionRepository;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public Preparation prepare(SubmissionStreamMessage message) {
    UUID submissionId = message.submissionId();
    Submission submission = submissionRepository.findByIdForUpdate(submissionId).orElse(null);

    if (submission == null) {
      return new Preparation(PreparationOutcome.NOT_FOUND, submissionId, null, 0, null, null);
    }

    Task task = submission.getTask();
    String sourceCode = submission.getSourceCode();

    int sourceSizeBytes = sourceCode == null ? 0 : sourceCode.getBytes(StandardCharsets.UTF_8).length;
    Long taskId = task == null ? null : task.getId();

    if (isTerminal(submission.getStatus())) {
      return new Preparation(
          PreparationOutcome.ALREADY_TERMINAL,
          submissionId,
          taskId,
          sourceSizeBytes,
          null, null);
    }

    if (submission.getStatus() != SubmissionStatus.QUEUED) {
      return new Preparation(PreparationOutcome.ALREADY_PROCESSING, submissionId, taskId,
          sourceSizeBytes, null, null);
    }
    if (submission.getRetryCount() >= MAX_EXECUTION_ATTEMPTS) {
      fail(submission, SubmissionStreamProcessor.RETRY_EXHAUSTED_MESSAGE);
      return new Preparation(PreparationOutcome.ALREADY_TERMINAL, submissionId, taskId,
          sourceSizeBytes, null, null);
    }

    if (task == null) {
      return reject(submission, SubmissionStreamProcessor.MALFORMED_MESSAGE);
    }
    if (sourceCode == null || sourceCode.isBlank()) {
      return reject(submission, SubmissionStreamProcessor.MALFORMED_MESSAGE);
    }
    if (!Objects.equals(taskId, message.taskId()) || !sourceCode.equals(message.sourceCode())) {
      submission.setStatus(SubmissionStatus.INFRA_ERROR);
      submission.setVerdict(null);
      submission.setExecutionTime(null);
      submission.setMemoryUsed(null);
      submission.setSafeMessage(SubmissionStreamProcessor.CONTRACT_MISMATCH_MESSAGE);
      submissionRepository.save(submission);
      return new Preparation(
          PreparationOutcome.CONTRACT_MISMATCH,
          submissionId,
          taskId,
          sourceSizeBytes,
          null, null);
    }

    if (!(task instanceof CodeTask codeTask)) {
      return reject(submission, "Task does not support code execution.");
    }
    if (codeTask.getTestCases() == null || codeTask.getTestCases().isBlank()) {
      return reject(submission, "Task has no judge test cases.");
    }

    Toolchain toolchain;
    try {
      toolchain = Toolchain.valueOf(submission.getLanguage().trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException | NullPointerException exception) {
      return reject(submission, "Task uses an unsupported toolchain.");
    }

    RunRequest runRequest = new RunRequest(
        sourceCode,
        codeTask.getTestCases(),
        codeTask.getMemoryLimitKb(),
        Duration.ofMillis(codeTask.getTimeLimitMs()),
        codeTask.getOutputLimitKb(),
        toolchain);

    submission.setStatus(SubmissionStatus.COMPILING);
    submission.setStartedAt(LocalDateTime.now());
    submission.setExecutionToken(UUID.randomUUID());
    submission.setRetryCount(submission.getRetryCount() + 1);
    submissionRepository.save(submission);
    return new Preparation(
        PreparationOutcome.READY,
        submissionId,
        taskId,
        sourceSizeBytes,
        runRequest, submission.getExecutionToken());
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public CompletionOutcome complete(UUID submissionId, UUID executionToken, DockerRunnerResult runnerResult) {
    Submission submission = submissionRepository.findByIdForUpdate(submissionId).orElse(null);
    if (submission == null) {
      return CompletionOutcome.NOT_FOUND;
    }
    if (isTerminal(submission.getStatus())) {
      return CompletionOutcome.ALREADY_TERMINAL;
    }

    if (!ownsExecution(submission, executionToken)) {
      return CompletionOutcome.STALE_ATTEMPT;
    }

    submission.setVerdict(runnerResult.verdict());
    submission.setExecutionTime(runnerResult.executionTimeMs());
    submission.setMemoryUsed(runnerResult.memoryUsedKb());
    submission.setSafeMessage(runnerResult.safeMessage());
    submission.setStatus(SubmissionStatus.FINISHED);
    submissionRepository.save(submission);
    return CompletionOutcome.COMPLETED;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public boolean markInfrastructureFailure(UUID submissionId, String safeMessage) {
    Submission submission = submissionRepository.findByIdForUpdate(submissionId).orElse(null);
    if (submission == null || isTerminal(submission.getStatus())) {
      return true;
    }
    // A poison/duplicate message must never cancel another worker's live attempt.
    if (submission.getStatus() != SubmissionStatus.QUEUED) {
      return false;
    }
    fail(submission, safeMessage);
    return true;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void retryExecution(UUID submissionId, UUID executionToken) {
    Submission submission = submissionRepository.findByIdForUpdate(submissionId).orElse(null);
    if (submission == null || !ownsExecution(submission, executionToken)) return;
    if (submission.getRetryCount() >= MAX_EXECUTION_ATTEMPTS) {
      fail(submission, SubmissionStreamProcessor.RETRY_EXHAUSTED_MESSAGE);
    } else {
      submission.setStatus(SubmissionStatus.QUEUED);
      submission.setStartedAt(null);
      submission.setExecutionToken(null);
      submission.setQueuedAt(LocalDateTime.now());
      submissionRepository.save(submission);
    }
  }

  private Preparation reject(Submission submission, String safeMessage) {
    fail(submission, safeMessage);
    return new Preparation(PreparationOutcome.CONTRACT_MISMATCH, submission.getId(),
        submission.getTask() == null ? null : submission.getTask().getId(), 0, null, null);
  }

  private boolean ownsExecution(Submission submission, UUID token) {
    return token != null && token.equals(submission.getExecutionToken())
        && (submission.getStatus() == SubmissionStatus.COMPILING || submission.getStatus() == SubmissionStatus.RUNNING);
  }

  private void fail(Submission submission, String safeMessage) {
    submission.setStatus(SubmissionStatus.INFRA_ERROR);
    submission.setVerdict(null);
    submission.setExecutionTime(null);
    submission.setMemoryUsed(null);
    submission.setSafeMessage(safeMessage);
    submissionRepository.save(submission);
  }

  private boolean isTerminal(SubmissionStatus status) {
    return status == SubmissionStatus.FINISHED
        || status == SubmissionStatus.INFRA_ERROR
        || status == SubmissionStatus.CANCELLED;
  }

  public enum PreparationOutcome {
    READY,
    ALREADY_PROCESSING,
    ALREADY_TERMINAL,
    NOT_FOUND,
    CONTRACT_MISMATCH
  }

  public enum CompletionOutcome {
    COMPLETED,
    STALE_ATTEMPT,
    ALREADY_TERMINAL,
    NOT_FOUND
  }

  public record Preparation(
      PreparationOutcome outcome,
      UUID submissionId,
      Long taskId,
      int sourceSizeBytes,
      RunRequest runRequest,
      UUID executionToken) {
  }
}
