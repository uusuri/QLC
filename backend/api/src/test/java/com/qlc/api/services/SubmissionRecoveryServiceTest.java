package com.qlc.api.services;

import com.qlc.shared.model.entities.CodeTask;
import com.qlc.shared.model.entities.Submission;
import com.qlc.shared.model.enums.SubmissionStatus;
import com.qlc.shared.monitoring.SubmissionMetrics;
import com.qlc.shared.repositories.SubmissionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubmissionRecoveryServiceTest {
  @Mock SubmissionRepository submissionRepository;
  @Mock RedisQueueService redisQueueService;
  @Mock SubmissionMetrics metrics;
  @InjectMocks SubmissionRecoveryService recovery;

  @Test
  void queuedSubmissionIsPublishedAgainByRecoveryJob() {
    Submission stuck = stuckSubmission();
    when(submissionRepository.findQueuedForRecovery(
        any(LocalDateTime.class), any(org.springframework.data.domain.Pageable.class)))
        .thenReturn(List.of(stuck));

    recovery.recoverStuckSubmissions();

    verify(redisQueueService).pushToStream(stuck);
  }

  @Test
  void failedRecoveryRemainsEligibleForNextRun() {
    Submission first = stuckSubmission();
    Submission second = stuckSubmission();
    when(submissionRepository.findQueuedForRecovery(
        any(LocalDateTime.class), any(org.springframework.data.domain.Pageable.class)))
        .thenReturn(List.of(first, second));
    doThrow(new IllegalStateException("redis unavailable"))
        .doNothing()
        .when(redisQueueService)
        .pushToStream(first);

    recovery.recoverStuckSubmissions();
    recovery.recoverStuckSubmissions();

    verify(redisQueueService, times(2)).pushToStream(first);
    verify(redisQueueService, times(1)).pushToStream(second);
  }

  private Submission stuckSubmission() {
    Submission submission = new Submission();
    submission.setId(UUID.randomUUID());
    submission.setTask(new CodeTask());
    submission.setLanguage("CPP23");
    submission.setSourceCode("int main() {}");
    submission.setStatus(SubmissionStatus.QUEUED);
    submission.setCreatedAt(LocalDateTime.now().minusMinutes(1));
    return submission;
  }
}
