package com.qlc.runners;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/** Trusted execution settings. Task limits are C++ baselines, adjusted for runtime overhead. */
public record LanguageProfile(
    String image,
    String sourceFile,
    List<String> compileCommand,
    List<String> runCommand,
    int timeMultiplier,
    long startupAllowanceMs,
    int memoryMultiplier,
    long minimumMemoryKb,
    boolean useAddressSpaceLimit,
    boolean useJvmHeapLimit) {

  public static LanguageProfile forToolchain(Toolchain toolchain) {
    return switch (toolchain) {
      case CPP23 -> new LanguageProfile(
          "qlc-cpp-runner:dev", "Main.cpp",
          List.of("g++", "-std=c++23", "-O2", "-pipe", "/request/Main.cpp", "-o", "/work/main"),
          List.of("/work/main"), 1, 0, 1, 0, true, false);
      case PYTHON312 -> python("qlc-python312-runner:dev", "/usr/local/bin/python3", 2, 128 * 1024L, true);
      case PYPY312 -> python("qlc-pypy312-runner:dev", "/opt/pypy/bin/pypy3", 4, 256 * 1024L, false);
      case JAVA21 -> new LanguageProfile(
          "qlc-java21-runner:dev", "Main.java",
          List.of("/opt/java/openjdk/bin/javac", "-d", "/work", "/request/Main.java"),
          List.of("/opt/java/openjdk/bin/java", "-XX:ActiveProcessorCount=1", "-cp", "/work", "Main"),
          2, 500, 3, 256 * 1024L, false, true);
      default -> throw new IllegalArgumentException("Toolchain is not runnable: " + toolchain);
    };
  }

  private static LanguageProfile python(String image, String interpreter, int memoryMultiplier,
      long minimumMemoryKb, boolean useAddressSpaceLimit) {
    return new LanguageProfile(
        image, "main.py",
        List.of(interpreter, "-c",
            "import ast, pathlib, sys; ast.parse(pathlib.Path(sys.argv[1]).read_text())",
            "/request/main.py"),
        List.of(interpreter, "-B", "/request/main.py"),
        3, 0, memoryMultiplier, minimumMemoryKb, useAddressSpaceLimit, false);
  }

  public static boolean isRunnable(String language) {
    return "CPP23".equalsIgnoreCase(language)
        || "PYTHON312".equalsIgnoreCase(language)
        || "PYPY312".equalsIgnoreCase(language)
        || "JAVA21".equalsIgnoreCase(language);
  }

  public Duration effectiveTime(Duration baseline) {
    try {
      return Duration.ofMillis(Math.addExact(
          Math.multiplyExact(baseline.toMillis(), timeMultiplier), startupAllowanceMs));
    } catch (ArithmeticException exception) {
      throw new IllegalArgumentException("Time limit is too large", exception);
    }
  }

  public long effectiveMemoryKb(long baseline) {
    try {
      return Math.max(Math.multiplyExact(baseline, memoryMultiplier), minimumMemoryKb);
    } catch (ArithmeticException exception) {
      throw new IllegalArgumentException("Memory limit is too large", exception);
    }
  }

  public List<String> runCommandForMemory(long effectiveMemoryKb) {
    if (!useJvmHeapLimit) {
      return runCommand;
    }
    // The JVM reserves a large virtual address range. Bound its heap separately,
    // then compare actual RSS to the effective task limit in the judge.
    long heapKb = Math.max(16 * 1024L, effectiveMemoryKb - 96 * 1024L);
    List<String> command = new ArrayList<>(runCommand);
    command.add(1, "-Xmx" + heapKb + "k");
    return List.copyOf(command);
  }
}
