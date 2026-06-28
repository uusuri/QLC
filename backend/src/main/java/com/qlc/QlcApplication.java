package com.qlc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class QlcApplication {
  public static void main(String[] args) {
    SpringApplication.run(QlcApplication.class, args);
  }
}
