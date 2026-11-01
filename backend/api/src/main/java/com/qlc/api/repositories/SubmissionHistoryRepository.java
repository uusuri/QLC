package com.qlc.api.repositories;

import com.qlc.api.models.dtos.SubmissionHistoryDetail;
import com.qlc.api.models.dtos.SubmissionHistoryItem;
import com.qlc.shared.model.entities.Submission;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface SubmissionHistoryRepository extends Repository<Submission, UUID> {
  @Query("select new com.qlc.api.models.dtos.SubmissionHistoryItem("
      + "s.id, s.task.id, s.language, s.status, s.verdict, s.executionTime, s.memoryUsed, s.createdAt) "
      + "from Submission s where s.user.id = :userId and s.task.id = :taskId "
      + "order by s.createdAt desc, s.id desc")
  Slice<SubmissionHistoryItem> findHistory(@Param("userId") Long userId, @Param("taskId") Long taskId,
      Pageable pageable);

  @Query("select new com.qlc.api.models.dtos.SubmissionHistoryDetail("
      + "s.id, s.task.id, s.language, s.sourceCode, s.submittedAnswer) "
      + "from Submission s where s.user.id = :userId and s.task.id = :taskId and s.id = :id")
  Optional<SubmissionHistoryDetail> findOwnDetail(@Param("userId") Long userId, @Param("taskId") Long taskId,
      @Param("id") UUID id);
}
