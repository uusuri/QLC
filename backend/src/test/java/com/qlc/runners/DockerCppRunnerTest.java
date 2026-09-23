package com.qlc.runners;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DockerCppRunnerTest {

  @Test
  void addsJudgeOverheadToTaskMemoryLimit() {
    long containerLimit = DockerCppRunner.containerMemoryLimitInBytes(65_536);

    assertEquals(320L * 1_024L * 1_024L, containerLimit);
  }

  @Test
  void rejectsMemoryLimitThatCannotBeConvertedToBytes() {
    assertThrows(
        IllegalArgumentException.class,
        () -> DockerCppRunner.containerMemoryLimitInBytes(Long.MAX_VALUE));
  }
}
