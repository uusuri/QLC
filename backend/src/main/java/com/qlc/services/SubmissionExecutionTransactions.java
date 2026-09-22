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
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@Service
public class SubmissionExecutionTransactions {

  private final SubmissionRepository submissionRepository;

  public SubmissionExecutionTransactions(SubmissionRepository submissionRepository) {
    this.submissionRepository = submissionRepository;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public Preparation prepare(SubmissionStreamMessage message) {
    UUID submissionId = message.submissionId();
    Submission submission = submissionRepository.findByIdForUpdate(submissionId).orElse(null);

    if (submission == null) {
      return new Preparation(PreparationOutcome.NOT_FOUND, submissionId, null, 0, null);
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
      return new Preparation(
          PreparationOutcome.ALREADY_TERMINAL,
          submissionId,
          taskId,
          sourceSizeBytes,
          null);
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
          null);
    }

    if (!(task instanceof CodeTask codeTask)) {
      throw new IllegalStateException("Task " + taskId + " is not a code task");
    }
    if (codeTask.getTestCases() == null || codeTask.getTestCases().isBlank()) {
      throw new IllegalStateException("Code task " + taskId + " has no test cases");
    }

    Toolchain toolchain;
    try {
      toolchain = Toolchain.valueOf(submission.getLanguage().trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException | NullPointerException exception) {
      throw new IllegalStateException(
          "Submission " + submissionId + " uses unsupported toolchain " + submission.getLanguage(),
          exception);
    }

    RunRequest runRequest = new RunRequest(
        sourceCode,
        codeTask.getTestCases(),
        codeTask.getMemoryLimitKb(),
        Duration.ofMillis(codeTask.getTimeLimitMs()),
        codeTask.getOutputLimitKb(),
        toolchain);

    submission.setStatus(SubmissionStatus.COMPILING);
    submissionRepository.save(submission);
    return new Preparation(
        PreparationOutcome.READY,
        submissionId,
        taskId,
        sourceSizeBytes,
        runRequest);
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public CompletionOutcome complete(UUID submissionId, DockerRunnerResult runnerResult) {
    Submission submission = submissionRepository.findByIdForUpdate(submissionId).orElse(null);
    if (submission == null) {
      return CompletionOutcome.NOT_FOUND;
    }
    if (isTerminal(submission.getStatus())) {
      return CompletionOutcome.ALREADY_TERMINAL;
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
  public void markInfrastructureFailure(UUID submissionId, String safeMessage) {
    Submission submission = submissionRepository.findByIdForUpdate(submissionId).orElse(null);
    if (submission == null || isTerminal(submission.getStatus())) {
      return;
    }

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
    ALREADY_TERMINAL,
    NOT_FOUND,
    CONTRACT_MISMATCH
  }

  public enum CompletionOutcome {
    COMPLETED,
    ALREADY_TERMINAL,
    NOT_FOUND
  }

  public record Preparation(
      PreparationOutcome outcome,
      UUID submissionId,
      Long taskId,
      int sourceSizeBytes,
      RunRequest runRequest) {
  }
}
