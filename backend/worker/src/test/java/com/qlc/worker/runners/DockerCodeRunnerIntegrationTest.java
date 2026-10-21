package com.qlc.worker.runners;

import com.qlc.shared.language.Toolchain;

import com.qlc.shared.model.enums.Verdict;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@EnabledIfEnvironmentVariable(named = "QLC_DOCKER_TESTS", matches = "true")
class DockerCodeRunnerIntegrationTest {

  private final DockerCodeRunner runner = new DockerCodeRunner(new ObjectMapper());

  @ParameterizedTest
  @ValueSource(strings = {"PYTHON312", "PYPY312"})
  void runsPythonWithMultipleInputs(String language) throws Exception {
    DockerRunnerResult result = runner.run(new RunRequest(
        "a, b = map(int, input().split())\nprint(a + b)\n",
        "[{\"input\":\"2 3\\n\",\"output\":\"5\\n\"},"
            + "{\"input\":\"-10 4\\n\",\"output\":\"-6\\n\"}]",
        65_536, Duration.ofSeconds(1), 4_096, Toolchain.valueOf(language)));

    assertEquals(Verdict.AC, result.verdict(), result.safeMessage());
    assertEquals(2, result.passedTests());
    assertEquals(2, result.totalTests());
    assertTrue(result.memoryUsedKb() > 0);
  }

  @ParameterizedTest
  @ValueSource(strings = {"PYTHON312", "PYPY312"})
  void pythonSyntaxErrorIsCompilationError(String language) throws Exception {
    DockerRunnerResult result = runner.run(new RunRequest(
        "if True print(1)\n",
        "[{\"input\":\"\",\"output\":\"1\\n\"}]",
        65_536, Duration.ofSeconds(1), 4_096, Toolchain.valueOf(language)));

    assertEquals(Verdict.CE, result.verdict());
  }

  @Test
  void runsJavaWithMultipleInputs() throws Exception {
    DockerRunnerResult result = runner.run(javaRequest(
        """
            import java.util.Scanner;
            public class Main {
              public static void main(String[] args) {
                Scanner scanner = new Scanner(System.in);
                System.out.println(scanner.nextInt() + scanner.nextInt());
              }
            }
            """,
        "[{\"input\":\"2 3\\n\",\"output\":\"5\\n\"},"
            + "{\"input\":\"-10 4\\n\",\"output\":\"-6\\n\"}]"));

    assertEquals(Verdict.AC, result.verdict(), result.safeMessage());
    assertEquals(2, result.passedTests());
    assertEquals(2, result.totalTests());
    assertTrue(result.memoryUsedKb() > 0);
  }

  @Test
  void javaCompilationErrorIsReportedAsCe() throws Exception {
    DockerRunnerResult result = runner.run(javaRequest(
        "public class Main { public static void main(String[] args) { nope } }",
        "[{\"input\":\"\",\"output\":\"\"}]"));

    assertEquals(Verdict.CE, result.verdict(), result.safeMessage());
    assertEquals(0, result.executionTimeMs());
    assertNull(result.memoryUsedKb());
  }

  @Test
  void javaWrongAnswerIsReportedAsWa() throws Exception {
    DockerRunnerResult result = runner.run(javaRequest(
        "public class Main { public static void main(String[] args) { System.out.println(4); } }",
        "[{\"input\":\"\",\"output\":\"5\\n\"}]"));

    assertEquals(Verdict.WA, result.verdict(), result.safeMessage());
  }

  @Test
  void javaUnhandledExceptionIsReportedAsRe() throws Exception {
    DockerRunnerResult result = runner.run(javaRequest(
        "public class Main { public static void main(String[] args) { throw new IllegalStateException(\"test\"); } }",
        "[{\"input\":\"\",\"output\":\"\"}]"));

    assertEquals(Verdict.RE, result.verdict(), result.safeMessage());
  }

  @Test
  void javaInfiniteLoopIsReportedAsTle() throws Exception {
    DockerRunnerResult result = runner.run(javaRequest(
        "public class Main { public static void main(String[] args) { while (true) {} } }",
        "[{\"input\":\"\",\"output\":\"\"}]",
        65_536, Duration.ofMillis(200), 4_096));

    assertEquals(Verdict.TLE, result.verdict(), result.safeMessage());
  }

  @Test
  void javaHeapExhaustionIsReportedAsMle() throws Exception {
    DockerRunnerResult result = runner.run(javaRequest(
        "public class Main { public static void main(String[] args) { byte[] data = new byte[200 * 1024 * 1024]; System.out.println(data.length); } }",
        "[{\"input\":\"\",\"output\":\"209715200\\n\"}]"));

    assertEquals(Verdict.MLE, result.verdict(), result.safeMessage());
  }

  @Test
  void javaExcessiveOutputIsReportedAsOle() throws Exception {
    DockerRunnerResult result = runner.run(javaRequest(
        "public class Main { public static void main(String[] args) { System.out.print(\"x\".repeat(2048)); } }",
        "[{\"input\":\"\",\"output\":\"\"}]",
        65_536, Duration.ofSeconds(1), 1));

    assertEquals(Verdict.OLE, result.verdict(), result.safeMessage());
  }

  @Test
  void javaOutputExactlyAtLimitIsAccepted() throws Exception {
    DockerRunnerResult result = runner.run(javaRequest(
        "public class Main { public static void main(String[] args) { System.out.print(\"x\".repeat(1024)); } }",
        "[{\"input\":\"\",\"output\":\"" + "x".repeat(1024) + "\"}]",
        65_536, Duration.ofSeconds(1), 1));

    assertEquals(Verdict.AC, result.verdict(), result.safeMessage());
  }

  @Test
  void returnsAcceptedWhenEveryTestPasses() throws Exception {
    DockerRunnerResult result = runner.run(request(
        """
            #include <iostream>
            int main() {
              int left;
              int right;
              std::cin >> left >> right;
              std::cout << left + right << std::endl;
            }
            """,
        """
            [
              {"input":"2 3\\n","output":"5\\n"},
              {"input":"-10 4\\n","output":"-6\\n"}
            ]
            """,
        Duration.ofSeconds(2)));

    assertEquals(Verdict.AC, result.verdict(), result.safeMessage());
    assertEquals(2, result.passedTests());
    assertEquals(2, result.totalTests());
    assertTrue(result.memoryUsedKb() > 0);
  }

  @Test
  void returnsWrongAnswerOnFirstMismatch() throws Exception {
    DockerRunnerResult result = runner.run(request(
        "int main() { __builtin_printf(\"0\\n\"); }",
        "[{\"input\":\"\",\"output\":\"1\\n\"}]",
        Duration.ofSeconds(2)));

    assertEquals(Verdict.WA, result.verdict());
    assertEquals(0, result.passedTests());
  }

  @Test
  void returnsCompilationError() throws Exception {
    DockerRunnerResult result = runner.run(request(
        "int main( {",
        "[{\"input\":\"\",\"output\":\"\"}]",
        Duration.ofSeconds(2)));

    assertEquals(Verdict.CE, result.verdict());
  }

  @Test
  void returnsTimeLimitExceeded() throws Exception {
    DockerRunnerResult result = runner.run(request(
        "int main() { while (true) {} }",
        "[{\"input\":\"\",\"output\":\"\"}]",
        Duration.ofMillis(200)));

    assertEquals(Verdict.TLE, result.verdict());
  }

  @Test
  void reportsPeakMemoryUsedByTheProgram() throws Exception {
    DockerRunnerResult result = runner.run(request(
        """
            #include <iostream>
            #include <vector>
            int main() {
              std::vector<unsigned char> memory(8 * 1024 * 1024, 1);
              unsigned long long sum = 0;
              for (unsigned char value : memory) {
                sum += value;
              }
              std::cout << sum << '\\n';
            }
            """,
        "[{\"input\":\"\",\"output\":\"8388608\\n\"}]",
        Duration.ofSeconds(2)));

    assertEquals(Verdict.AC, result.verdict(), result.safeMessage());
    assertTrue(result.memoryUsedKb() >= 8 * 1_024, "Expected at least 8 MiB of peak RSS");
  }

  @Test
  void enforcesOutputLimitFromRequest() throws Exception {
    DockerRunnerResult result = runner.run(request(
        """
            #include <iostream>
            int main() {
              for (int index = 0; index < 2'048; ++index) {
                std::cout << 'x';
              }
            }
            """,
        "[{\"input\":\"\",\"output\":\"\"}]",
        65_536,
        Duration.ofSeconds(2),
        1));

    assertEquals(Verdict.OLE, result.verdict(), result.safeMessage());
  }

  @Test
  void enforcesMemoryLimitFromRequest() throws Exception {
    DockerRunnerResult result = runner.run(request(
        """
            #include <iostream>
            int main() {
              long* values = new long[10'000'000];
              for (long index = 0; index < 10'000'000; ++index) {
                values[index] = 1;
              }
              std::cout << values[0] << '\\n';
              delete[] values;
            }
            """,
        "[{\"input\":\"\",\"output\":\"1\\n\"}]",
        65_536,
        Duration.ofSeconds(2),
        4_096));

    assertEquals(Verdict.MLE, result.verdict(), result.safeMessage());
  }

  private RunRequest request(String sourceCode, String testCases, Duration timeLimit) {
    return request(sourceCode, testCases, 65_536, timeLimit, 4_096);
  }

  private RunRequest javaRequest(String sourceCode, String testCases) {
    return javaRequest(sourceCode, testCases, 65_536, Duration.ofSeconds(1), 4_096);
  }

  private RunRequest javaRequest(
      String sourceCode,
      String testCases,
      long memoryLimitInKb,
      Duration timeLimit,
      long outputLimitInKb) {
    return new RunRequest(
        sourceCode,
        testCases,
        memoryLimitInKb,
        timeLimit,
        outputLimitInKb,
        Toolchain.JAVA21);
  }

  private RunRequest request(
      String sourceCode,
      String testCases,
      long memoryLimitInKb,
      Duration timeLimit,
      long outputLimitInKb) {
    return new RunRequest(
        sourceCode,
        testCases,
        memoryLimitInKb,
        timeLimit,
        outputLimitInKb,
        Toolchain.CPP23);
  }
}
