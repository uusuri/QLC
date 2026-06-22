package com.qlc.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

@Entity
@DiscriminatorValue("NUMERIC")
@Getter
@Setter
public class NumericTask extends Task {
  @Column(name = "correct_numeric_answer", precision = 19, scale = 4)
  private BigDecimal correctNumericAnswer;
}
