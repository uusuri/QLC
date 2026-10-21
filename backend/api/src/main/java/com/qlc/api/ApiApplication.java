package com.qlc.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = {"com.qlc.api", "com.qlc.shared"})
@EntityScan("com.qlc.shared.model.entities")
@EnableJpaRepositories(basePackages = {"com.qlc.api.repositories", "com.qlc.shared.repositories"})
@EnableAsync
@EnableScheduling
public class ApiApplication {
  public static void main(String[] args) {
    SpringApplication.run(ApiApplication.class, args);
  }
}
