package com.qlc.runners;

import java.time.Duration;

public record RunRequest(
    String sourceCode,
    String stdin,
    long memoryLimitInKb,
    Duration timeLimit,
    long outputLimitInKb,
    Toolchain toolchain) {
}
