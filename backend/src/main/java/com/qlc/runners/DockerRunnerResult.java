package com.qlc.runners;

public record DockerRunnerResult(
    int exitCode,
    String stdout,
    String stderr,
    long executionTimeMs) {
}
