package com.qlc.repositories;

import com.qlc.models.entities.Submission;
import com.qlc.models.enums.SubmissionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
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

  @Query("select distinct submission.task.id from Submission submission "
      + "where submission.user.id = :userId and submission.verdict = :verdict")
  Set<Long> findTaskIdsByUserIdAndVerdict(@Param("userId") Long userId,
      @Param("verdict") Verdict verdict);

  default Set<Long> findAcceptedTaskIdsByUserId(Long userId) {
    return findTaskIdsByUserIdAndVerdict(userId, Verdict.AC);
  }

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select submission from Submission submission where submission.id = :id")
  Optional<Submission> findByIdForUpdate(@Param("id") UUID id);

  List<Submission> findTop50ByStatusAndCreatedAtBeforeOrderByCreatedAtAsc(
      SubmissionStatus status,
      LocalDateTime cutoff);
}
