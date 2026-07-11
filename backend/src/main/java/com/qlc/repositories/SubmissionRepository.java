package com.qlc.repositories;

import com.qlc.models.entities.Submission;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.UUID;
import java.util.Optional;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, UUID> {
  Optional<Submission> findByIdempotencyKey(String key);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select submission from Submission submission where submission.id = :id")
  Optional<Submission> findByIdForUpdate(@Param("id") UUID id);
}
