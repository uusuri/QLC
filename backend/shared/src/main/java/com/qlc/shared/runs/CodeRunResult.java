package com.qlc.shared.runs;

import java.util.List;
import java.util.UUID;

public record CodeRunResult(UUID id, String status, String message, List<CaseResult> tests) {
  public record CaseResult(String status, String stdout, String stderr, long executionTimeMs,
      Long memoryUsedKb, boolean outputTruncated, String message) { }
}
