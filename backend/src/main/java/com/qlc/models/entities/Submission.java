package com.qlc.models.entities;

import com.qlc.models.enums.SubmissionStatus;
import com.qlc.models.enums.Verdict;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "submissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = { "task", "user" })
public class Submission {
  @Id
  private UUID id;

  @Version
  private Long version;

  @Column(name = "idempotency_key", length = 100, unique = true)
  private String idempotencyKey;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "task_id", nullable = false)
  private Task task;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id")
  private User user;

  @Column(nullable = false, length = 50)
  private String language;

  @Column(name = "source_code", nullable = false, columnDefinition = "TEXT")
  private String sourceCode;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 50)
  private SubmissionStatus status;

  @Enumerated(EnumType.STRING)
  @Column(length = 50)
  private Verdict verdict;

  @Column(name = "execution_time")
  private Long executionTime;

  @Column(name = "memory_used")
  private Long memoryUsed;

  @Column(name = "safe_message", columnDefinition = "TEXT")
  private String safeMessage;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @PrePersist
  protected void onCreate() {
    if (this.id == null) {
      this.id = UUID.randomUUID();
    }
    this.createdAt = LocalDateTime.now();
  }
}
