package com.qlc.services;

import com.qlc.models.messages.SubmissionStreamMessage;
import com.qlc.runners.DockerCppRunner;
import com.qlc.runners.DockerRunnerResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.UUID;

@Service
public class SubmissionStreamProcessor {

  static final String CONTRACT_MISMATCH_MESSAGE = "Redis Stream payload does not match the persisted submission metadata.";
  static final String RETRY_EXHAUSTED_MESSAGE = "Submission processing failed after the maximum number of retries.";
  static final String UNSUPPORTED_SCHEMA_MESSAGE = "Submission message uses an unsupported schema version.";
  static final String MALFORMED_MESSAGE = "Submission message is malformed.";

  private final SubmissionExecutionTransactions transactions;
  private final DockerCppRunner dockerCppRunner;

  public SubmissionStreamProcessor(
      SubmissionExecutionTransactions transactions,
      DockerCppRunner dockerCppRunner) {
    this.transactions = transactions;
    this.dockerCppRunner = dockerCppRunner;
  }

  @Transactional(propagation = Propagation.NOT_SUPPORTED)
  public ProcessingResult process(SubmissionStreamMessage message) {
    SubmissionExecutionTransactions.Preparation preparation = transactions.prepare(message);
    if (preparation.outcome() != SubmissionExecutionTransactions.PreparationOutcome.READY) {
      return resultFor(preparation);
    }

    DockerRunnerResult runnerResult;
    try {
      runnerResult = dockerCppRunner.run(preparation.runRequest());
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Runner execution was interrupted", exception);
    } catch (IOException exception) {
      throw new IllegalStateException("Failed to execute judge container", exception);
    }

    SubmissionExecutionTransactions.CompletionOutcome completion =
        transactions.complete(preparation.submissionId(), runnerResult);

    return new ProcessingResult(
        switch (completion) {
          case COMPLETED -> ProcessingOutcome.COMPLETED;
          case ALREADY_TERMINAL -> ProcessingOutcome.ALREADY_TERMINAL;
          case NOT_FOUND -> ProcessingOutcome.NOT_FOUND;
        },
        preparation.submissionId(),
        preparation.taskId(),
        preparation.sourceSizeBytes());
  }

  public void markInfrastructureFailure(UUID submissionId, String safeMessage) {
    transactions.markInfrastructureFailure(submissionId, safeMessage);
  }

  private ProcessingResult resultFor(SubmissionExecutionTransactions.Preparation preparation) {
    ProcessingOutcome outcome = switch (preparation.outcome()) {
      case ALREADY_TERMINAL -> ProcessingOutcome.ALREADY_TERMINAL;
      case NOT_FOUND -> ProcessingOutcome.NOT_FOUND;
      case CONTRACT_MISMATCH -> ProcessingOutcome.CONTRACT_MISMATCH;
      case READY -> throw new IllegalArgumentException("Ready preparation must be executed");
    };
    return new ProcessingResult(
        outcome,
        preparation.submissionId(),
        preparation.taskId(),
        preparation.sourceSizeBytes());
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
