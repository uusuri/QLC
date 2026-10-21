package com.qlc.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class ApiApplicationTests {
  @Autowired ApplicationContext context;

  @Test
  void contextLoads() {
    assertThat(context.getBeansOfType(com.qlc.worker.runners.DockerCodeRunner.class)).isEmpty();
    assertThat(context.getBeansOfType(com.qlc.worker.queue.RedisSubmissionWorker.class)).isEmpty();
    assertThat(context.getBeansOfType(com.qlc.worker.execution.SubmissionStreamProcessor.class)).isEmpty();
    assertThat(context.getBeansOfType(com.qlc.api.services.SubmissionRecoveryService.class)).hasSize(1);
  }
}
