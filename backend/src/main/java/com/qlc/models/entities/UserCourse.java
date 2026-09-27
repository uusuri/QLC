package com.qlc.models.entities;

import jakarta.persistence.*;
import lombok.*;

/** Metadata for the existing user_courses membership; purchases still own membership. */
@Entity
@Table(name = "user_courses")
@IdClass(UserCourseId.class)
@Getter @Setter @NoArgsConstructor
public class UserCourse {
  @Id @Column(name = "user_id")
  private Long userId;
  @Id @Column(name = "course_id")
  private Long courseId;
  @Column(name = "selected_language", length = 32)
  private String selectedLanguage;
}
