package com.qlc.services;

import com.qlc.models.entities.CodeTask;
import com.qlc.models.entities.Submission;
import com.qlc.models.enums.SubmissionStatus;
import com.qlc.models.enums.Verdict;
import com.qlc.models.messages.SubmissionStreamMessage;
import com.qlc.repositories.SubmissionRepository;
import com.qlc.runners.DockerCppRunner;
import com.qlc.runners.DockerRunnerResult;
import com.qlc.runners.RunRequest;
import com.qlc.runners.Toolchain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubmissionStreamProcessorTest {

  @Mock
  private SubmissionRepository submissionRepository;

  @Mock
  private DockerCppRunner dockerCppRunner;

  private SubmissionStreamProcessor processor;

  @BeforeEach
  void setUp() {
    SubmissionExecutionTransactions transactions = new SubmissionExecutionTransactions(submissionRepository);
    processor = new SubmissionStreamProcessor(transactions, dockerCppRunner);
  }

  @Test
  void queuedSubmissionRunsInDockerAndBecomesFinished() throws Exception {
    UUID submissionId = UUID.randomUUID();
    Submission submission = submission(submissionId, SubmissionStatus.QUEUED, "int main() { return 0; }");
    when(submissionRepository.findByIdForUpdate(submissionId)).thenReturn(Optional.of(submission));
    when(submissionRepository.save(submission)).thenReturn(submission);
    when(dockerCppRunner.run(any(RunRequest.class))).thenReturn(new DockerRunnerResult(
        Verdict.AC,
        2,
        2,
        17,
        2_048L,
        "Пройдено тестов: 2 из 2."));

    SubmissionStreamProcessor.ProcessingResult result = processor.process(message(submission));

    assertEquals(SubmissionStreamProcessor.ProcessingOutcome.COMPLETED, result.outcome());
    assertEquals(42L, result.taskId());
    assertEquals(SubmissionStatus.FINISHED, submission.getStatus());
    assertEquals(Verdict.AC, submission.getVerdict());
    assertEquals(17L, submission.getExecutionTime());
    assertEquals(2_048L, submission.getMemoryUsed());
    assertEquals("Пройдено тестов: 2 из 2.", submission.getSafeMessage());
    assertFalse(submission.getSafeMessage().contains(submission.getSourceCode()));

    ArgumentCaptor<RunRequest> requestCaptor = ArgumentCaptor.forClass(RunRequest.class);
    verify(dockerCppRunner).run(requestCaptor.capture());
    RunRequest runRequest = requestCaptor.getValue();
    assertEquals(submission.getSourceCode(), runRequest.sourceCode());
    assertEquals(submission.getTask() instanceof CodeTask codeTask ? codeTask.getTestCases() : null,
        runRequest.testCasesJson());
    assertEquals(65_536, runRequest.memoryLimitInKb());
    assertEquals(Duration.ofMillis(2_000), runRequest.timeLimit());
    assertEquals(4_096, runRequest.outputLimitInKb());
    assertEquals(Toolchain.CPP23, runRequest.toolchain());
    verify(submissionRepository, times(2)).save(submission);
  }

  @Test
  void dockerStartFailureLeavesMessageAvailableForRetry() throws Exception {
    UUID submissionId = UUID.randomUUID();
    Submission submission = submission(submissionId, SubmissionStatus.QUEUED, "int main() {}");
    when(submissionRepository.findByIdForUpdate(submissionId)).thenReturn(Optional.of(submission));
    when(dockerCppRunner.run(any(RunRequest.class))).thenThrow(new IOException("Docker is unavailable"));

    IllegalStateException exception = assertThrows(
        IllegalStateException.class,
        () -> processor.process(message(submission)));

    assertEquals("Failed to execute judge container", exception.getMessage());
    assertEquals(SubmissionStatus.QUEUED, submission.getStatus());
    verify(submissionRepository, times(2)).save(submission);
  }

  @Test
  void duplicateMessageDoesNotOverwriteTerminalSubmission() {
    UUID submissionId = UUID.randomUUID();
    Submission submission = submission(submissionId, SubmissionStatus.FINISHED, "int main() {}");
    submission.setVerdict(Verdict.WA);
    submission.setSafeMessage("existing result");
    when(submissionRepository.findByIdForUpdate(submissionId)).thenReturn(Optional.of(submission));

    SubmissionStreamProcessor.ProcessingResult result = processor.process(message(submission));

    assertEquals(SubmissionStreamProcessor.ProcessingOutcome.ALREADY_TERMINAL, result.outcome());
    assertEquals(Verdict.WA, submission.getVerdict());
    assertEquals("existing result", submission.getSafeMessage());
    verify(submissionRepository, never()).save(submission);
  }

  @Test
  void duplicateRunningMessageDoesNotStartAnotherExecution() {
    UUID submissionId = UUID.randomUUID();
    Submission submission = submission(submissionId, SubmissionStatus.RUNNING, "int main() {}");
    when(submissionRepository.findByIdForUpdate(submissionId)).thenReturn(Optional.of(submission));
    SubmissionStreamProcessor.ProcessingResult result = processor.process(message(submission));
    assertEquals(SubmissionStreamProcessor.ProcessingOutcome.ALREADY_PROCESSING, result.outcome());
    assertEquals(SubmissionStatus.RUNNING, submission.getStatus());
    org.mockito.Mockito.verifyNoInteractions(dockerCppRunner);
  }

  @Test
  void missingSubmissionIsReportedWithoutCreatingData() {
    UUID submissionId = UUID.randomUUID();
    when(submissionRepository.findByIdForUpdate(submissionId)).thenReturn(Optional.empty());

    SubmissionStreamProcessor.ProcessingResult result = processor.process(new SubmissionStreamMessage(
        "1",
        submissionId,
        42L,
        "int main() {}"));

    assertEquals(SubmissionStreamProcessor.ProcessingOutcome.NOT_FOUND, result.outcome());
    verify(submissionRepository, never()).save(org.mockito.ArgumentMatchers.any());
  }

  @Test
  void corruptedSubmissionWithoutSourceIsRejected() {
    UUID submissionId = UUID.randomUUID();
    Submission submission = submission(submissionId, SubmissionStatus.QUEUED, " ");
    when(submissionRepository.findByIdForUpdate(submissionId)).thenReturn(Optional.of(submission));

    assertEquals(SubmissionStreamProcessor.ProcessingOutcome.CONTRACT_MISMATCH, processor.process(message(submission)).outcome());
    assertEquals(SubmissionStatus.INFRA_ERROR, submission.getStatus());
  }

  @Test
  void mismatchedTaskOrSourceIsRejectedWithoutOverwritingDatabase() {
    UUID submissionId = UUID.randomUUID();
    Submission submission = submission(submissionId, SubmissionStatus.QUEUED, "int main() {}");
    when(submissionRepository.findByIdForUpdate(submissionId)).thenReturn(Optional.of(submission));

    SubmissionStreamProcessor.ProcessingResult result = processor.process(new SubmissionStreamMessage(
        "1",
        submissionId,
        99L,
        "different source"));

    assertEquals(SubmissionStreamProcessor.ProcessingOutcome.CONTRACT_MISMATCH, result.outcome());
    assertEquals(SubmissionStatus.INFRA_ERROR, submission.getStatus());
    assertEquals(null, submission.getVerdict());
    assertEquals(SubmissionStreamProcessor.CONTRACT_MISMATCH_MESSAGE, submission.getSafeMessage());
    assertFalse(submission.getSafeMessage().contains("different source"));
    verify(submissionRepository).save(submission);
  }

  @Test
  void retryExhaustionMarksActiveSubmissionAsInfrastructureError() {
    UUID submissionId = UUID.randomUUID();
    Submission submission = submission(submissionId, SubmissionStatus.QUEUED, "int main() {}");
    when(submissionRepository.findByIdForUpdate(submissionId)).thenReturn(Optional.of(submission));

    processor.markInfrastructureFailure(
        submissionId,
        SubmissionStreamProcessor.RETRY_EXHAUSTED_MESSAGE);

    assertEquals(SubmissionStatus.INFRA_ERROR, submission.getStatus());
    assertEquals(SubmissionStreamProcessor.RETRY_EXHAUSTED_MESSAGE, submission.getSafeMessage());
    verify(submissionRepository).save(submission);
  }

  @Test
  void retryExhaustionDoesNotOverwriteFinishedSubmission() {
    UUID submissionId = UUID.randomUUID();
    Submission submission = submission(submissionId, SubmissionStatus.FINISHED, "int main() {}");
    submission.setVerdict(Verdict.AC);
    submission.setSafeMessage("existing result");
    when(submissionRepository.findByIdForUpdate(submissionId)).thenReturn(Optional.of(submission));

    processor.markInfrastructureFailure(
        submissionId,
        SubmissionStreamProcessor.RETRY_EXHAUSTED_MESSAGE);

    assertEquals(SubmissionStatus.FINISHED, submission.getStatus());
    assertEquals(Verdict.AC, submission.getVerdict());
    assertEquals("existing result", submission.getSafeMessage());
    verify(submissionRepository, never()).save(submission);
  }

  private Submission submission(UUID id, SubmissionStatus status, String sourceCode) {
    CodeTask task = new CodeTask();
    task.setId(42L);
    task.setStatementMd("Temporary task");
    task.setTestCases("[{\"input\":\"\",\"output\":\"\"}]");

    Submission submission = new Submission();
    submission.setId(id);
    submission.setTask(task);
    submission.setLanguage("CPP23");
    submission.setSourceCode(sourceCode);
    submission.setStatus(status);
    return submission;
  }

  private SubmissionStreamMessage message(Submission submission) {
    return new SubmissionStreamMessage(
        "1",
        submission.getId(),
        submission.getTask().getId(),
        submission.getSourceCode());
  }
}
