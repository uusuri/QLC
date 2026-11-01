package com.qlc.worker.runners;

import com.qlc.shared.language.Toolchain;

import java.time.Duration;

public record RunRequest(
    String sourceCode,
    String testCasesJson,
    long memoryLimitInKb,
    Duration timeLimit,
    long outputLimitInKb,
    Toolchain toolchain,
    boolean customRun) {
  public RunRequest(String sourceCode, String testCasesJson, long memoryLimitInKb,
      Duration timeLimit, long outputLimitInKb, Toolchain toolchain) {
    this(sourceCode, testCasesJson, memoryLimitInKb, timeLimit, outputLimitInKb, toolchain, false);
  }
}
