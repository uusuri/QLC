package com.qlc.runners;

import com.qlc.models.enums.Verdict;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@EnabledIfEnvironmentVariable(named = "QLC_DOCKER_TESTS", matches = "true")
class DockerCppRunnerIntegrationTest {

  private final DockerCppRunner runner = new DockerCppRunner(new ObjectMapper());

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

  private RunRequest request(String sourceCode, String testCases, Duration timeLimit) {
    return new RunRequest(
        sourceCode,
        testCases,
        65_536,
        timeLimit,
        4_096,
        Toolchain.CPP23);
  }
}
