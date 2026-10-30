package com.qlc.worker.runners;

import com.qlc.shared.language.Toolchain;
import com.qlc.shared.model.enums.Verdict;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import tools.jackson.databind.ObjectMapper;
import java.time.Duration;
import static org.assertj.core.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "QLC_DOCKER_TESTS", matches = "true")
class CustomRunDockerIntegrationTest {
  DockerCodeRunner runner = new DockerCodeRunner(new ObjectMapper());

  @ParameterizedTest
  @EnumSource(value = Toolchain.class, names = {"CPP23", "JAVA21", "PYTHON312", "PYPY312"})
  void returnsAllCustomResultsAndBothStreams(Toolchain language) throws Exception {
    String source = switch (language) {
      case CPP23 -> "#include <iostream>\nint main(){int a,b;std::cin>>a>>b;std::cout<<a+b<<'\\n';std::cerr<<\"debug\\n\";}";
      case JAVA21 -> "import java.util.*; public class Main { public static void main(String[] args) { var s=new Scanner(System.in); System.out.println(s.nextInt()+s.nextInt()); System.err.println(\"debug\"); }}";
      default -> "import sys\na,b=map(int,input().split())\nprint(a+b)\nprint('debug', file=sys.stderr)\n";
    };
    var result = runner.run(new RunRequest(source,
        "[{\"input\":\"3 5\\n\",\"output\":\"8\\n\"},{\"input\":\"1 2\\n\",\"output\":\"9\"},{\"input\":\"-1 4\\n\",\"output\":null}]",
        65536, Duration.ofSeconds(2), 64, language, true));
    assertThat(result.tests()).extracting(test -> test.status()).containsExactly("AC", "WA", "OK");
    assertThat(result.tests()).extracting(test -> test.stdout()).containsExactly("8\n", "3\n", "3\n");
    assertThat(result.tests()).allSatisfy(test -> {
      assertThat(test.stderr()).isEqualTo("debug\n");
      assertThat(test.memoryUsedKb()).isPositive();
      assertThat(test.executionTimeMs()).isPositive();
    });
  }

  @Test void reportsCompilationErrorWithoutInventedTestResults() throws Exception {
    var result = cpp("this is not C++", "[{\"input\":\"\"}]", 1000, 64);
    assertThat(result.verdict()).isEqualTo(Verdict.CE);
    assertThat(result.tests()).isEmpty();
    assertThat(result.safeMessage()).contains("Ошибка компиляции");
  }

  @Test void timeoutAndRuntimeFailureDoNotSkipRemainingTests() throws Exception {
    var result = cpp("#include <iostream>\nint main(){int n;std::cin>>n;if(n==1)while(true){};if(n==2){std::cerr<<\"bad\\n\";return 7;}std::cout<<5;}",
        "[{\"input\":\"1\"},{\"input\":\"2\"},{\"input\":\"3\",\"output\":\"5\"}]", 100, 64);
    assertThat(result.tests()).extracting(test -> test.status()).containsExactly("TLE", "RE", "AC");
    assertThat(result.tests().get(1).stderr()).contains("bad");
  }

  @Test void largeOutputIsBoundedAndFlagged() throws Exception {
    var result = cpp("#include <iostream>\nint main(){for(int i=0;i<40000;i++)std::cout<<'x';}",
        "[{\"input\":\"\"}]", 1000, 64);
    assertThat(result.tests().getFirst().stdout()).hasSize(16384);
    assertThat(result.tests().getFirst().outputTruncated()).isTrue();
  }

  DockerRunnerResult cpp(String source, String tests, long timeMs, long outputKb) throws Exception {
    return runner.run(new RunRequest(source, tests, 65536, Duration.ofMillis(timeMs), outputKb, Toolchain.CPP23, true));
  }
}
