package com.qlc.repositories;

import com.qlc.models.entities.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;
import java.util.Optional;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, UUID> {
  Optional<Submission> findByIdempotencyKey(String key);
}
