package com.qlc.worker;

import com.qlc.shared.repositories.SubmissionRepository;
import com.qlc.worker.execution.SubmissionStreamProcessor;
import com.qlc.worker.runners.DockerCodeRunner;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.util.ClassUtils;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class WorkerApplicationTest {
  @Autowired ApplicationContext context;

  @Test
  void loadsRunnerAndPersistenceWithoutApiOrSecrets() {
    assertThat(context.getBean(DockerCodeRunner.class)).isNotNull();
    assertThat(context.getBean(SubmissionStreamProcessor.class)).isNotNull();
    assertThat(context.getBean(SubmissionRepository.class)).isNotNull();
    assertThat(ClassUtils.isPresent("com.qlc.api.ApiApplication", getClass().getClassLoader())).isFalse();
    assertThat(ClassUtils.isPresent("org.springframework.security.web.SecurityFilterChain", getClass().getClassLoader()))
        .isFalse();
    assertThat(context.containsBean("flyway")).isFalse();
  }
}
