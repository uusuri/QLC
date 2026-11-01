package com.qlc.shared.model.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** A permanent reward snapshot: one accepted task per user, independent of later task edits. */
@Entity
@Table(name = "user_task_experience", uniqueConstraints =
    @UniqueConstraint(name = "uq_user_task_experience", columnNames = {"user_id", "task_id"}))
@Getter
@NoArgsConstructor
public class TaskExperience {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  // Deliberately not a foreign key: removing a task must not remove earned XP.
  @Column(name = "task_id", nullable = false)
  private Long taskId;

  @Column(nullable = false)
  private int xp;

  @Column(name = "submission_id", nullable = false)
  private UUID submissionId;

  @Column(name = "awarded_at", nullable = false)
  private LocalDateTime awardedAt;
}
