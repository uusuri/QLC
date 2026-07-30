package com.qlc.models.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@DiscriminatorValue("CODE")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CodeTask extends Task {

  @Column(name = "language", length = 32)
  private String language = "CPP23";

  @Column(name = "starter_code", columnDefinition = "TEXT")
  private String starterCode;

  @Column(name = "template_code", columnDefinition = "TEXT")
  private String templateCode;

  @Column(name = "test_cases", columnDefinition = "TEXT")
  private String testCases;

  @Column(name = "time_limit_ms", nullable = false)
  private int timeLimitMs = 2000;

  @Column(name = "memory_limit_kb", nullable = false)
  private int memoryLimitKb = 65536;

  @Column(name = "output_limit_kb", nullable = false)
  private int outputLimitKb = 4096;

  @Column(name = "test_set_version", nullable = false)
  private int testSetVersion = 1;
}
