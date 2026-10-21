package com.qlc.worker.runners;

import com.qlc.shared.model.enums.Verdict;

public record DockerRunnerResult(
    Verdict verdict,
    int passedTests,
    int totalTests,
    long executionTimeMs,
    Long memoryUsedKb,
    String safeMessage) {
}
