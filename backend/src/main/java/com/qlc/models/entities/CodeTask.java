package com.qlc.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@DiscriminatorValue("CODE")
@Getter
@Setter
public class CodeTask extends Task {
  @Column(name = "template_code", columnDefinition = "TEXT")
  private String templateCode;

  @Column(name = "test_cases", columnDefinition = "TEXT")
  private String testCases;
}
