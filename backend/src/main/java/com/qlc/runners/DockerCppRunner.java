package com.qlc.runners;

import org.springframework.stereotype.Component;
import java.io.IOException;
import java.nio.file.*;
import java.util.Comparator;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

@Component
public class DockerCppRunner {
  private static final System.Logger LOGGER = System.getLogger(DockerCppRunner.class.getName());

  public int run(RunRequest request) throws IOException, InterruptedException {
    validate(request);
    Path tempDir = null;
    String containerName = "cpp-runner-" + UUID.randomUUID();
    int outputCode = -1;

    Process runnerProcess = null;
    try {
      tempDir = Files.createTempDirectory("cpp-runner-");
      Files.writeString(tempDir.resolve("Main.cpp"), request.sourceCode());
      Files.writeString(tempDir.resolve("input.txt"), request.stdin());

      String wallTimeLimitSeconds = String.format(
          Locale.ROOT,
          "%.3f",
          request.timeLimit().toMillis() / 1000.0);

      ProcessBuilder runnerProcessBuilder = new ProcessBuilder(
          "docker",
          "run",
          "--rm",
          "--name",
          containerName,
          "--network",
          "none",
          "--read-only",
          "--tmpfs",
          "/work:rw,exec,nosuid,size=64m",
          "--tmpfs",
          "/tmp:rw,nosuid,size=32m",
          "--mount",
          "type=bind,src=" + tempDir.toAbsolutePath() + ",dst=/request,readonly",
          "--env",
          "QLC_WALL_TIME_LIMIT_SECONDS=" + wallTimeLimitSeconds,
          "qlc-cpp-runner:dev");

      runnerProcessBuilder.redirectOutput(ProcessBuilder.Redirect.DISCARD);
      runnerProcessBuilder.redirectError(ProcessBuilder.Redirect.DISCARD);

      runnerProcess = runnerProcessBuilder.start();
      long outerTimeoutMillis = request.timeLimit().plusSeconds(30).toMillis();
      boolean finished = runnerProcess.waitFor(outerTimeoutMillis, TimeUnit.MILLISECONDS);

      if (!finished) {
        runnerProcess.destroyForcibly();
        runnerProcess.waitFor();
      }

      outputCode = runnerProcess.exitValue();
    } finally {
      if (runnerProcess != null && runnerProcess.isAlive()) {
        runnerProcess.destroyForcibly();
      }
      removeContainer(containerName);
      deleteRecursively(tempDir);
    }
    return outputCode;
  }

  private void deleteRecursively(Path directory) {
    if (directory == null || Files.notExists(directory)) {
      return;
    }

    try (Stream<Path> paths = Files.walk(directory)) {
      for (Path path : paths.sorted(Comparator.reverseOrder()).toList()) {
        Files.deleteIfExists(path);
      }
    } catch (IOException exception) {
      LOGGER.log(System.Logger.Level.WARNING, "Failed to delete runner directory " + directory, exception);
    }
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
      throw new IOException("Failed to remove container " + containerName, exception);
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
