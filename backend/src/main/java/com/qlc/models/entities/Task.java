package com.qlc.models.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.Getter;
import lombok.ToString;

@Entity
@Table(name = "tasks")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "task_type", discriminatorType = DiscriminatorType.STRING)
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@ToString(exclude = "lesson")
public abstract class Task {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "task_text", nullable = false, columnDefinition = "TEXT")
  private String taskText;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "lesson_id", nullable = false)
  private Lesson lesson;

  @Transient // Указывает Hibernate, что этого поля нет в таблице как отдельной колонки
  public String getTaskType() {
    // Извлекает значение @DiscriminatorValue, которое прописано над наследником
    DiscriminatorValue val = this.getClass().getAnnotation(DiscriminatorValue.class);
    return val != null ? val.value() : null;
  }
}
