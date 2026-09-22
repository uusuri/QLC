package com.qlc.runners;

import com.qlc.models.enums.Verdict;

public record DockerRunnerResult(
    Verdict verdict,
    int passedTests,
    int totalTests,
    long executionTimeMs,
    Long memoryUsedKb,
    String safeMessage) {
}
