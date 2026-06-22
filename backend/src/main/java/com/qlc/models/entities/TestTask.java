package com.qlc.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Entity
@DiscriminatorValue("TEST")
@Getter
@Setter
public class TestTask extends Task {
  @ElementCollection
  @CollectionTable(name = "task_test_options", joinColumns = @JoinColumn(name = "task_id"))
  @Column(name = "option_text")
  private List<String> options;

  @Column(name = "correct_option_index")
  private Integer correctOptionIndex;
}
