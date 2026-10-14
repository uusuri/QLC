package com.qlc.repositories;

import com.qlc.models.entities.Submission;
import com.qlc.models.dtos.SubmissionResultDTO;
import com.qlc.models.enums.SubmissionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.UUID;
import java.util.Optional;
import java.util.Set;
import java.util.List;
import java.time.LocalDateTime;
import com.qlc.models.enums.Verdict;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, UUID> {
  Optional<Submission> findByIdempotencyKey(String key);

  Optional<Submission> findByIdempotencyKeyAndUserId(String key, Long userId);

  @Query("select new com.qlc.models.dtos.SubmissionResultDTO("
      + "submission.id, task.id, user.id, submission.language, submission.status, "
      + "submission.verdict, submission.executionTime, submission.memoryUsed, "
      + "submission.safeMessage, submission.createdAt) "
      + "from Submission submission "
      + "join submission.task task "
      + "left join submission.user user "
      + "where submission.id = :id")
  Optional<SubmissionResultDTO> findResultById(@Param("id") UUID id);

  @Query("select distinct submission.task.id from Submission submission "
      + "where submission.user.id = :userId and submission.verdict = :verdict "
      + "and submission.status = com.qlc.models.enums.SubmissionStatus.FINISHED "
      + "and submission.countsForProgress = true")
  Set<Long> findTaskIdsByUserIdAndVerdict(@Param("userId") Long userId,
      @Param("verdict") Verdict verdict);

  default Set<Long> findAcceptedTaskIdsByUserId(Long userId) {
    return findTaskIdsByUserIdAndVerdict(userId, Verdict.AC);
  }

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select submission from Submission submission "
      + "join fetch submission.task "
      + "where submission.id = :id")
  Optional<Submission> findByIdForUpdate(@Param("id") UUID id);

  @Query("select s from Submission s join fetch s.task "
      + "where s.status = com.qlc.models.enums.SubmissionStatus.QUEUED "
      + "and coalesce(s.queuedAt, s.createdAt) < :cutoff "
      + "order by coalesce(s.queuedAt, s.createdAt), s.id")
  List<Submission> findQueuedForRecovery(@Param("cutoff") LocalDateTime cutoff, Pageable pageable);

  @Query("select s.id from Submission s where s.status in "
      + "(com.qlc.models.enums.SubmissionStatus.COMPILING, com.qlc.models.enums.SubmissionStatus.RUNNING) "
      + "and coalesce(s.startedAt, s.createdAt) < :cutoff "
      + "order by coalesce(s.startedAt, s.createdAt), s.id")
  List<UUID> findExpiredExecutionIds(@Param("cutoff") LocalDateTime cutoff, Pageable pageable);
}
