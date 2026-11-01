package com.qlc.shared.repositories;

import com.qlc.shared.model.entities.TaskExperience;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaskExperienceRepository extends JpaRepository<TaskExperience, Long> {
  @Query("select coalesce(sum(reward.xp), 0) from TaskExperience reward where reward.userId = :userId")
  long totalXp(@Param("userId") Long userId);

  @Query("select reward.xp from TaskExperience reward where reward.userId = :userId "
      + "and reward.taskId = :taskId and reward.submissionId = :submissionId")
  java.util.Optional<Integer> findAwardedXp(@Param("userId") Long userId, @Param("taskId") Long taskId,
      @Param("submissionId") UUID submissionId);

  // The unique constraint arbitrates simultaneous ACs, including different worker processes.
  @Modifying
  @Query(value = """
      insert into user_task_experience (user_id, task_id, xp, submission_id, awarded_at)
      values (:userId, :taskId, :xp, :submissionId, :awardedAt)
      on conflict do nothing
      """, nativeQuery = true)
  int awardOnce(@Param("userId") Long userId, @Param("taskId") Long taskId,
      @Param("xp") int xp, @Param("submissionId") UUID submissionId,
      @Param("awardedAt") LocalDateTime awardedAt);
}
