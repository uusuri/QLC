package com.qlc.runners;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

public class DockerCppRunner {
  public int run(RunRequest request) throws IOException, InterruptedException {
    validate(request);
    Path tempDir = null;
    Path sourceFile = null;
    String containerName = "cpp-runner " + UUID.randomUUID();
    int outputCode = -1;

    Process compileProcess = null;
    try {
      tempDir = Files.createTempDirectory("cpp-runner-");
      sourceFile = tempDir.resolve("main.cpp");
      Files.writeString(sourceFile, request.sourceCode());

      ProcessBuilder compileProcessBuilder = new ProcessBuilder(
          "docker",
          "run",
          "--rm",
          "-v",
          tempDir.toAbsolutePath() + ":/usr/src/cpp-runner-",
          "--name",
          containerName,
          "--network",
          "none",
          "-w",
          "/usr/src/cpp-runner-",
          "qlc-cpp-runner:dev",
          "g++",
          "-o",
          "main",
          "main.cpp");

      compileProcess = compileProcessBuilder.start();
      boolean finished = compileProcess.waitFor(2, TimeUnit.SECONDS);

      if (!finished) {
        compileProcess.destroyForcibly();
      }

      outputCode = compileProcess.exitValue();
    } finally {
      if (compileProcess != null && compileProcess.isAlive()) {
        compileProcess.destroyForcibly();
      }
      removeContainer(containerName);
    }
    return outputCode;
  }

  private void removeContainer(String containerName) throws IOException {
    try {
      Process cleanup = new ProcessBuilder(
          "docker",
          "rm",
          "-f",
          containerName)
          .redirectOutput(ProcessBuilder.Redirect.DISCARD)
          .redirectError(ProcessBuilder.Redirect.DISCARD)
          .start();

      if (!cleanup.waitFor(5, TimeUnit.SECONDS)) {
        cleanup.destroyForcibly();
      }
    } catch (IOException exception) {
      throw new IOException("Remove Container IO exeption");
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
    }
  }

  public void validate(RunRequest request) {
    if (request.sourceCode().isEmpty()) {
      throw new IllegalArgumentException("Source code cannot be empty");
    }

    if (request.stdin() == null) {
      throw new IllegalArgumentException("Stdin cannot be null");
    }

    if (request.memoryLimitInKb() <= 0) {
      throw new IllegalArgumentException("Memory limit must be greater than 0");
    }

    if (request.timeLimit().isNegative() || request.timeLimit().isZero()) {
      throw new IllegalArgumentException("Time limit must be greater than 0");
    }

    if (request.outputLimitInKb() <= 0) {
      throw new IllegalArgumentException("Output limit must be greater than 0");
    }

    if (request.toolchain() != Toolchain.CPP23) {
      throw new IllegalArgumentException("Unsupported toolchain: " + request.toolchain());
    }
  }
}
