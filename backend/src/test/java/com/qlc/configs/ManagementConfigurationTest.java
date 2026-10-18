package com.qlc.configs;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;

class ManagementConfigurationTest {

  @Test
  void devActuatorUsesSeparateLoopbackPort() throws IOException {
    assertManagementConfiguration("application-dev.yml", "${MANAGEMENT_LOCAL_PORT:9092}");
  }

  @Test
  void prodActuatorUsesSeparateLoopbackPort() throws IOException {
    assertManagementConfiguration("application-prod.yml", "${MANAGEMENT_LOCAL_PORT:9091}");
  }

  private void assertManagementConfiguration(String resource, String expectedPort) throws IOException {
    PropertySource<?> properties = new YamlPropertySourceLoader()
        .load(resource, new ClassPathResource(resource)).getFirst();

    assertThat(properties.getProperty("management.server.port")).isEqualTo(expectedPort);
    assertThat(properties.getProperty("management.server.address")).isEqualTo("127.0.0.1");
    assertThat(properties.getProperty("management.endpoints.web.exposure.include"))
        .isEqualTo("health,prometheus");
    assertThat(properties.getProperty("spring.management.server.port")).isNull();
  }
}
