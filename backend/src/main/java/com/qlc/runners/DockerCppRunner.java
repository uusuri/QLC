package com.qlc.runners;

import com.qlc.models.enums.Verdict;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.time.Duration;
import java.util.Comparator;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

@Component
public class DockerCppRunner {

  private static final System.Logger LOGGER = System.getLogger(DockerCppRunner.class.getName());
  private static final String IMAGE_NAME = "qlc-cpp-runner:dev";
  private static final int MAX_TEST_CASES = 100;

  private final ObjectMapper objectMapper;

  public DockerCppRunner(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public DockerRunnerResult run(RunRequest request) throws IOException, InterruptedException {
    validate(request);

    Path tempRoot = null;
    Process runnerProcess = null;
    String containerName = "cpp-runner-" + UUID.randomUUID();

    try {
      tempRoot = Files.createTempDirectory("cpp-runner-");
      Path requestDirectory = Files.createDirectory(tempRoot.resolve("request"));
      Path transportDirectory = Files.createDirectory(tempRoot.resolve("transport"));
      Path sourceFile = requestDirectory.resolve("Main.cpp");
      Path judgeOutputFile = transportDirectory.resolve("judge.stdout");
      Path containerErrorFile = transportDirectory.resolve("container.stderr");

      Files.writeString(sourceFile, request.sourceCode(), StandardCharsets.UTF_8);
      makeReadableByContainer(requestDirectory, sourceFile);

      ProcessBuilder processBuilder = new ProcessBuilder(
          "docker",
          "run",
          "--rm",
          "--interactive",
          "--name",
          containerName,
          "--network",
          "none",
          "--read-only",
          "--cap-drop",
          "ALL",
          "--security-opt",
          "no-new-privileges",
          "--pids-limit",
          "64",
          "--user",
          "65534:65534",
          "--tmpfs",
          "/work:rw,exec,nosuid,size=64m,mode=1777",
          "--tmpfs",
          "/tmp:rw,nosuid,size=32m,mode=1777",
          "--mount",
          "type=bind,src=" + requestDirectory.toAbsolutePath() + ",dst=/request,readonly",
          "--env",
          "QLC_TIME_LIMIT_MS=" + request.timeLimit().toMillis(),
          "--env",
          "QLC_MEMORY_LIMIT_KB=" + request.memoryLimitInKb(),
          "--env",
          "QLC_OUTPUT_LIMIT_KB=" + request.outputLimitInKb(),
          IMAGE_NAME);

      processBuilder.redirectOutput(judgeOutputFile.toFile());
      processBuilder.redirectError(containerErrorFile.toFile());

      runnerProcess = processBuilder.start();
      try (OutputStream containerInput = runnerProcess.getOutputStream()) {
        containerInput.write(request.testCasesJson().getBytes(StandardCharsets.UTF_8));
      }

      boolean finished = runnerProcess.waitFor(outerTimeout(request).toMillis(), TimeUnit.MILLISECONDS);
      if (!finished) {
        runnerProcess.destroyForcibly();
        runnerProcess.waitFor();
        throw new IOException("Judge container exceeded the outer timeout");
      }

      String judgeOutput = Files.readString(judgeOutputFile, StandardCharsets.UTF_8);
      String containerError = Files.readString(containerErrorFile, StandardCharsets.UTF_8);
      int exitCode = runnerProcess.exitValue();

      if (exitCode != 0) {
        throw new IOException(
            "Judge container failed with exit code " + exitCode + formatDiagnostic(containerError));
      }

      JudgePayload payload;
      try {
        payload = objectMapper.readValue(judgeOutput, JudgePayload.class);
      } catch (RuntimeException exception) {
        throw new IOException("Judge returned malformed JSON" + formatDiagnostic(judgeOutput), exception);
      }

      Verdict verdict;
      try {
        verdict = Verdict.valueOf(payload.verdict());
      } catch (IllegalArgumentException | NullPointerException exception) {
        throw new IOException("Judge returned unsupported verdict: " + payload.verdict(), exception);
      }

      return new DockerRunnerResult(
          verdict,
          payload.passedTests(),
          payload.totalTests(),
          payload.executionTimeMs(),
          payload.memoryUsedKb(),
          payload.safeMessage());
    } finally {
      if (runnerProcess != null && runnerProcess.isAlive()) {
        runnerProcess.destroyForcibly();
      }
      removeContainer(containerName);
      deleteRecursively(tempRoot);
    }
  }

  private Duration outerTimeout(RunRequest request) {
    long requestedMillis;
    try {
      requestedMillis = Math.addExact(
          Math.multiplyExact(request.timeLimit().toMillis(), MAX_TEST_CASES),
          Duration.ofSeconds(30).toMillis());
    } catch (ArithmeticException exception) {
      requestedMillis = Duration.ofMinutes(10).toMillis();
    }
    long boundedMillis = Math.clamp(
        requestedMillis,
        Duration.ofMinutes(1).toMillis(),
        Duration.ofMinutes(10).toMillis());
    return Duration.ofMillis(boundedMillis);
  }

  private void makeReadableByContainer(Path directory, Path sourceFile) throws IOException {
    try {
      Files.setPosixFilePermissions(directory, Set.of(
          PosixFilePermission.OWNER_READ,
          PosixFilePermission.OWNER_EXECUTE,
          PosixFilePermission.GROUP_READ,
          PosixFilePermission.GROUP_EXECUTE,
          PosixFilePermission.OTHERS_READ,
          PosixFilePermission.OTHERS_EXECUTE));
      Files.setPosixFilePermissions(sourceFile, Set.of(
          PosixFilePermission.OWNER_READ,
          PosixFilePermission.GROUP_READ,
          PosixFilePermission.OTHERS_READ));
    } catch (UnsupportedOperationException exception) {
      LOGGER.log(System.Logger.Level.DEBUG, "POSIX permissions are unavailable for " + directory);
    }
  }

  private String formatDiagnostic(String diagnostic) {
    if (diagnostic == null || diagnostic.isBlank()) {
      return "";
    }
    String trimmed = diagnostic.strip();
    int maximumLength = 4_000;
    if (trimmed.length() > maximumLength) {
      trimmed = trimmed.substring(0, maximumLength) + "\n[truncated]";
    }
    return ":\n" + trimmed;
  }

  private void deleteRecursively(Path directory) {
    if (directory == null || Files.notExists(directory)) {
      return;
    }

    restoreOwnerDirectoryPermissions(directory);
    try (Stream<Path> paths = Files.walk(directory)) {
      for (Path path : paths.sorted(Comparator.reverseOrder()).toList()) {
        Files.deleteIfExists(path);
      }
    } catch (IOException exception) {
      LOGGER.log(System.Logger.Level.WARNING, "Failed to delete runner directory " + directory, exception);
    }
  }

  private void restoreOwnerDirectoryPermissions(Path directory) {
    try (Stream<Path> paths = Files.walk(directory)) {
      for (Path path : paths.filter(Files::isDirectory).toList()) {
        try {
          Files.setPosixFilePermissions(path, Set.of(
              PosixFilePermission.OWNER_READ,
              PosixFilePermission.OWNER_WRITE,
              PosixFilePermission.OWNER_EXECUTE));
        } catch (UnsupportedOperationException exception) {
          return;
        }
      }
    } catch (IOException exception) {
      LOGGER.log(System.Logger.Level.WARNING, "Failed to restore permissions for " + directory, exception);
    }
  }

  private void removeContainer(String containerName) {
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
      LOGGER.log(System.Logger.Level.WARNING, "Failed to remove container " + containerName, exception);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
    }
  }

  public void validate(RunRequest request) {
    if (request == null) {
      throw new IllegalArgumentException("Run request cannot be null");
    }
    if (request.sourceCode() == null || request.sourceCode().isBlank()) {
      throw new IllegalArgumentException("Source code cannot be empty");
    }
    if (request.testCasesJson() == null || request.testCasesJson().isBlank()) {
      throw new IllegalArgumentException("Test cases cannot be empty");
    }
    if (request.memoryLimitInKb() <= 0) {
      throw new IllegalArgumentException("Memory limit must be greater than 0");
    }
    if (request.timeLimit() == null || request.timeLimit().isNegative() || request.timeLimit().isZero()) {
      throw new IllegalArgumentException("Time limit must be greater than 0");
    }
    if (request.outputLimitInKb() <= 0) {
      throw new IllegalArgumentException("Output limit must be greater than 0");
    }
    if (request.toolchain() != Toolchain.CPP23) {
      throw new IllegalArgumentException("Unsupported toolchain: " + request.toolchain());
    }
  }

  private record JudgePayload(
      String verdict,
      int passedTests,
      int totalTests,
      long executionTimeMs,
      Long memoryUsedKb,
      String safeMessage) {
  }
}
