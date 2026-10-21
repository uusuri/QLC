package com.qlc.shared.model.entities;

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
  @OrderColumn(name = "option_position")
  @Column(name = "option_text")
  private List<String> options;

  @ElementCollection
  @CollectionTable(name = "task_test_correct_indexes", joinColumns = @JoinColumn(name = "task_id"))
  @Column(name = "correct_index")
  private List<Integer> correctOptionIndexes;
}
