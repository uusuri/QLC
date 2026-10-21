package com.qlc.worker;

import java.io.IOException;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.io.ClassPathResource;
import static org.assertj.core.api.Assertions.assertThat;

class WorkerManagementConfigurationTest {
  @Test
  void onlyExposesLocalHealthAndMetricsWithoutApiPortOrSecrets() throws IOException {
    var properties = new YamlPropertySourceLoader()
        .load("worker", new ClassPathResource("application.yaml")).getFirst();
    assertThat(properties.getProperty("server.address")).isEqualTo("127.0.0.1");
    assertThat(properties.getProperty("server.port")).isEqualTo("${WORKER_MANAGEMENT_PORT:9094}");
    assertThat(properties.getProperty("management.server.port")).isNull();
    assertThat(properties.getProperty("management.endpoints.web.exposure.include")).isEqualTo("health,prometheus");
    assertThat(properties.getProperty("jwt.secret")).isNull();
    assertThat(properties.getProperty("app.mail.resend-api-key")).isNull();
  }

  @Test
  void prodHasItsOwnWorkerPort() throws IOException {
    var properties = new YamlPropertySourceLoader()
        .load("worker-prod", new ClassPathResource("application-prod.yml")).getFirst();
    assertThat(properties.getProperty("server.port")).isEqualTo("${WORKER_MANAGEMENT_PORT:9093}");
  }
}
