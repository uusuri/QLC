package com.qlc.shared.runs;

import java.util.List;
import java.util.UUID;

/** A temporary, owner-only run. Never persisted as a graded submission. */
public record CodeRunJob(UUID id, Long userId, Long taskId, String language, String sourceCode,
    List<TestCase> tests, long memoryLimitKb, long timeLimitMs, long outputLimitKb) {
  public record TestCase(String input, String output) { }
}
