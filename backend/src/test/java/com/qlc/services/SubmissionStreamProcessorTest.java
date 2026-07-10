package com.qlc.services;

import com.qlc.models.entities.CodeTask;
import com.qlc.models.entities.Submission;
import com.qlc.models.enums.SubmissionStatus;
import com.qlc.models.enums.Verdict;
import com.qlc.models.messages.SubmissionStreamMessage;
import com.qlc.repositories.SubmissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubmissionStreamProcessorTest {

  @Mock
  private SubmissionRepository submissionRepository;

  private SubmissionStreamProcessor processor;

  @BeforeEach
  void setUp() {
    processor = new SubmissionStreamProcessor(submissionRepository);
  }

  @Test
  void queuedSubmissionBecomesFinishedAndAccepted() {
    UUID submissionId = UUID.randomUUID();
    Submission submission = submission(submissionId, SubmissionStatus.QUEUED, "int main() { return 0; }");
    when(submissionRepository.findByIdForUpdate(submissionId)).thenReturn(Optional.of(submission));
    when(submissionRepository.save(submission)).thenReturn(submission);

    SubmissionStreamProcessor.ProcessingResult result = processor.process(message(submission));

    assertEquals(SubmissionStreamProcessor.ProcessingOutcome.COMPLETED, result.outcome());
    assertEquals(42L, result.taskId());
    assertEquals(SubmissionStatus.FINISHED, submission.getStatus());
    assertEquals(Verdict.AC, submission.getVerdict());
    assertEquals(0L, submission.getExecutionTime());
    assertEquals(0L, submission.getMemoryUsed());
    assertEquals(SubmissionStreamProcessor.TEMPORARY_SUCCESS_MESSAGE, submission.getSafeMessage());
    assertFalse(submission.getSafeMessage().contains(submission.getSourceCode()));
    verify(submissionRepository).save(submission);
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
  void staleRunningSubmissionCanBeCompletedIdempotently() {
    UUID submissionId = UUID.randomUUID();
    Submission submission = submission(submissionId, SubmissionStatus.RUNNING, "int main() {}");
    when(submissionRepository.findByIdForUpdate(submissionId)).thenReturn(Optional.of(submission));
    when(submissionRepository.save(submission)).thenReturn(submission);

    SubmissionStreamProcessor.ProcessingResult result = processor.process(message(submission));

    assertEquals(SubmissionStreamProcessor.ProcessingOutcome.COMPLETED, result.outcome());
    assertEquals(SubmissionStatus.FINISHED, submission.getStatus());
    assertEquals(Verdict.AC, submission.getVerdict());
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

    assertThrows(IllegalStateException.class, () -> processor.process(message(submission)));
    verify(submissionRepository, never()).save(submission);
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

  private Submission submission(UUID id, SubmissionStatus status, String sourceCode) {
    CodeTask task = new CodeTask();
    task.setId(42L);
    task.setStatementMd("Temporary task");

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
