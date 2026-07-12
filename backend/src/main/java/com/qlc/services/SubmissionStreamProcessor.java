package com.qlc.services;

import com.qlc.models.entities.Submission;
import com.qlc.models.entities.Task;
import com.qlc.models.enums.SubmissionStatus;
import com.qlc.models.enums.Verdict;
import com.qlc.models.messages.SubmissionStreamMessage;
import com.qlc.repositories.SubmissionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.UUID;

@Service
public class SubmissionStreamProcessor {

  static final String TEMPORARY_SUCCESS_MESSAGE = "Temporary worker stub: sandbox execution is not implemented; submission marked AC for integration testing.";
  static final String CONTRACT_MISMATCH_MESSAGE = "Redis Stream payload does not match the persisted submission metadata.";

  private final SubmissionRepository submissionRepository;

  public SubmissionStreamProcessor(SubmissionRepository submissionRepository) {
    this.submissionRepository = submissionRepository;
  }

  @Transactional
  public ProcessingResult process(SubmissionStreamMessage message) {
    UUID submissionId = message.submissionId();
    Submission submission = submissionRepository.findByIdForUpdate(submissionId).orElse(null);

    if (submission == null) {
      return new ProcessingResult(ProcessingOutcome.NOT_FOUND, submissionId, null, 0);
    }

    Task task = submission.getTask();
    String sourceCode = submission.getSourceCode();

    if (task == null) {
      throw new IllegalStateException("Submission " + submissionId + " has no task");
    }
    if (sourceCode == null || sourceCode.isBlank()) {
      throw new IllegalStateException("Submission " + submissionId + " has no source code");
    }

    int sourceSizeBytes = sourceCode.getBytes(StandardCharsets.UTF_8).length;
    Long taskId = task.getId();

    if (isTerminal(submission.getStatus())) {
      return new ProcessingResult(
          ProcessingOutcome.ALREADY_TERMINAL,
          submissionId,
          taskId,
          sourceSizeBytes);
    }

    if (!Objects.equals(taskId, message.taskId()) || !sourceCode.equals(message.sourceCode())) {
      submission.setStatus(SubmissionStatus.INFRA_ERROR);
      submission.setVerdict(null);
      submission.setExecutionTime(null);
      submission.setMemoryUsed(null);
      submission.setSafeMessage(CONTRACT_MISMATCH_MESSAGE);
      submissionRepository.save(submission);
      return new ProcessingResult(
          ProcessingOutcome.CONTRACT_MISMATCH,
          submissionId,
          taskId,
          sourceSizeBytes);
    }

    submission.setStatus(SubmissionStatus.COMPILING);
    submission.setStatus(SubmissionStatus.RUNNING);
    submission.setVerdict(Verdict.AC);
    submission.setExecutionTime(0L);
    submission.setMemoryUsed(0L);
    submission.setSafeMessage(TEMPORARY_SUCCESS_MESSAGE);
    submission.setStatus(SubmissionStatus.FINISHED);
    submissionRepository.save(submission);

    return new ProcessingResult(
        ProcessingOutcome.COMPLETED,
        submissionId,
        taskId,
        sourceSizeBytes);
  }

  private boolean isTerminal(SubmissionStatus status) {
    return status == SubmissionStatus.FINISHED
        || status == SubmissionStatus.INFRA_ERROR
        || status == SubmissionStatus.CANCELLED;
  }

  public enum ProcessingOutcome {
    COMPLETED,
    ALREADY_TERMINAL,
    NOT_FOUND,
    CONTRACT_MISMATCH
  }

  public record ProcessingResult(
      ProcessingOutcome outcome,
      UUID submissionId,
      Long taskId,
      int sourceSizeBytes) {
  }
}
