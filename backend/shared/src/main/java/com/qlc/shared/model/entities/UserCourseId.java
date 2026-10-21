package com.qlc.shared.model.entities;

import java.io.Serializable;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @EqualsAndHashCode
public class UserCourseId implements Serializable {
  private Long userId;
  private Long courseId;
}
