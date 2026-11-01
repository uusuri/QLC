package com.qlc.shared.services;

import com.qlc.shared.model.entities.CodeTask;
import com.qlc.shared.model.entities.Submission;
import com.qlc.shared.model.entities.User;
import com.qlc.shared.model.enums.SubmissionStatus;
import com.qlc.shared.model.enums.Verdict;
import com.qlc.shared.repositories.TaskExperienceRepository;
import java.time.LocalDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.assertj.core.api.Assertions.assertThat;

class ExperienceServiceTest {
  private final TaskExperienceRepository rewards = mock(TaskExperienceRepository.class);
  private final ExperienceService service = new ExperienceService(rewards);

  @ParameterizedTest
  @EnumSource(value = SubmissionStatus.class, names = "FINISHED", mode = EnumSource.Mode.EXCLUDE)
  void ignoresEveryNonFinishedStatusIncludingDemo(SubmissionStatus status) {
    Submission submission = accepted();
    submission.setStatus(status);
    service.awardAccepted(submission);
    verifyNoInteractions(rewards);
  }

  @Test
  void ignoresWrongAnswersExcludedHistoryAndAnonymousAttempts() {
    Submission submission = accepted(); submission.setVerdict(Verdict.WA);
    service.awardAccepted(submission);
    submission = accepted(); submission.setCountsForProgress(false);
    service.awardAccepted(submission);
    submission = accepted(); submission.setUser(null);
    service.awardAccepted(submission);
    verifyNoInteractions(rewards);
  }

  @Test
  void grantsDifficultyWeightedRewardForEligibleAcceptedTask() {
    Submission submission = accepted();
    when(rewards.awardOnce(anyLong(), anyLong(), anyInt(), any(UUID.class), any(LocalDateTime.class))).thenReturn(1);
    assertThat(service.awardAccepted(submission)).isEqualTo(30);
    verify(rewards).awardOnce(eq(1L), eq(2L), eq(30), eq(submission.getId()), any(LocalDateTime.class));
  }

  @Test
  void reportsZeroWhenTheDatabaseRejectsADuplicateGrant() {
    assertThat(service.awardAccepted(accepted())).isZero();
  }

  private Submission accepted() {
    User user = new User(); user.setId(1L);
    CodeTask task = new CodeTask(); task.setId(2L); task.setDifficulty((short) 3);
    Submission submission = new Submission();
    submission.setId(UUID.randomUUID()); submission.setUser(user); submission.setTask(task);
    submission.setStatus(SubmissionStatus.FINISHED); submission.setVerdict(Verdict.AC);
    return submission;
  }
}
