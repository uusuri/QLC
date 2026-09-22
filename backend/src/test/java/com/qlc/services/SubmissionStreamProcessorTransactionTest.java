package com.qlc.services;

import com.qlc.models.entities.CodeTask;
import com.qlc.models.entities.Submission;
import com.qlc.models.enums.SubmissionStatus;
import com.qlc.models.enums.Verdict;
import com.qlc.models.messages.SubmissionStreamMessage;
import com.qlc.repositories.SubmissionRepository;
import com.qlc.runners.DockerCppRunner;
import com.qlc.runners.DockerRunnerResult;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SubmissionStreamProcessorTransactionTest {

  @Test
  void dockerRunsBetweenTransactions() throws Exception {
    try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(TestConfiguration.class)) {
      SubmissionRepository repository = context.getBean(SubmissionRepository.class);
      DockerCppRunner runner = context.getBean(DockerCppRunner.class);
      SubmissionStreamProcessor processor = context.getBean(SubmissionStreamProcessor.class);
      Submission submission = submission();

      when(repository.findByIdForUpdate(submission.getId())).thenAnswer(invocation -> {
        assertTrue(TransactionSynchronizationManager.isActualTransactionActive());
        return Optional.of(submission);
      });
      when(repository.save(submission)).thenAnswer(invocation -> {
        assertTrue(TransactionSynchronizationManager.isActualTransactionActive());
        return submission;
      });
      when(runner.run(any())).thenAnswer(invocation -> {
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
        return new DockerRunnerResult(Verdict.AC, 1, 1, 5, 2_048L, "OK");
      });

      processor.process(new SubmissionStreamMessage(
          "1",
          submission.getId(),
          submission.getTask().getId(),
          submission.getSourceCode()));

      verify(runner).run(any());
    }
  }

  private Submission submission() {
    CodeTask task = new CodeTask();
    task.setId(42L);
    task.setStatementMd("Task");
    task.setTestCases("[{\"input\":\"\",\"output\":\"\"}]");

    Submission submission = new Submission();
    submission.setId(UUID.randomUUID());
    submission.setTask(task);
    submission.setLanguage("CPP23");
    submission.setSourceCode("int main() { return 0; }");
    submission.setStatus(SubmissionStatus.QUEUED);
    return submission;
  }

  @Configuration
  @EnableTransactionManagement
  static class TestConfiguration {

    @Bean
    PlatformTransactionManager transactionManager() {
      return new TestTransactionManager();
    }

    @Bean
    SubmissionRepository submissionRepository() {
      return mock(SubmissionRepository.class);
    }

    @Bean
    DockerCppRunner dockerCppRunner() {
      return mock(DockerCppRunner.class);
    }

    @Bean
    SubmissionExecutionTransactions submissionExecutionTransactions(SubmissionRepository repository) {
      return new SubmissionExecutionTransactions(repository);
    }

    @Bean
    SubmissionStreamProcessor submissionStreamProcessor(
        SubmissionExecutionTransactions transactions,
        DockerCppRunner runner) {
      return new SubmissionStreamProcessor(transactions, runner);
    }
  }

  static class TestTransactionManager extends AbstractPlatformTransactionManager {

    @Override
    protected Object doGetTransaction() {
      return new Object();
    }

    @Override
    protected void doBegin(Object transaction, TransactionDefinition definition) {
    }

    @Override
    protected void doCommit(DefaultTransactionStatus status) {
    }

    @Override
    protected void doRollback(DefaultTransactionStatus status) {
    }
  }
}
