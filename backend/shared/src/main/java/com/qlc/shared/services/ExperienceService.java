package com.qlc.shared.services;

import com.qlc.shared.model.dtos.ExperienceSummary;
import com.qlc.shared.model.entities.Submission;
import com.qlc.shared.model.enums.SubmissionStatus;
import com.qlc.shared.model.enums.Verdict;
import com.qlc.shared.repositories.TaskExperienceRepository;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExperienceService {
  private final TaskExperienceRepository rewards;

  public ExperienceService(TaskExperienceRepository rewards) {
    this.rewards = rewards;
  }

  @Transactional(readOnly = true)
  public ExperienceSummary summary(Long userId) {
    return ExperienceSummary.fromTotalXp(rewards.totalXp(userId));
  }

  /** Commit the reward and accepted result together, or roll both back. */
  @Transactional(propagation = Propagation.MANDATORY)
  public int awardAccepted(Submission submission) {
    if (submission.getStatus() != SubmissionStatus.FINISHED || submission.getVerdict() != Verdict.AC
        || !submission.isCountsForProgress() || submission.getUser() == null
        || submission.getUser().getId() == null || submission.getTask() == null
        || submission.getTask().getId() == null || submission.getId() == null) return 0;

    int difficulty = Math.max(1, Math.min(3, submission.getTask().getDifficulty()));
    int inserted = rewards.awardOnce(submission.getUser().getId(), submission.getTask().getId(), difficulty * 10,
        submission.getId(), LocalDateTime.now());
    return inserted == 1 ? difficulty * 10 : 0;
  }

  @Transactional(readOnly = true)
  public int awardedForSubmission(Long userId, Long taskId, java.util.UUID submissionId) {
    if (userId == null) return 0;
    return rewards.findAwardedXp(userId, taskId, submissionId).orElse(0);
  }
}
