package com.qlc.worker.runners;

import com.qlc.shared.model.enums.Verdict;
import com.qlc.shared.runs.CodeRunResult.CaseResult;
import java.util.List;

public record DockerRunnerResult(
    Verdict verdict,
    int passedTests,
    int totalTests,
    long executionTimeMs,
    Long memoryUsedKb,
    String safeMessage,
    List<CaseResult> tests) {
  public DockerRunnerResult(Verdict verdict, int passedTests, int totalTests, long executionTimeMs,
      Long memoryUsedKb, String safeMessage) {
    this(verdict, passedTests, totalTests, executionTimeMs, memoryUsedKb, safeMessage, List.of());
  }
}
