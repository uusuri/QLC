package com.qlc.services;

import com.qlc.models.entities.CodeTask;
import com.qlc.models.entities.Course;
import com.qlc.models.entities.Lesson;
import com.qlc.models.entities.Module;
import com.qlc.models.entities.Submission;
import com.qlc.models.enums.SubmissionStatus;
import com.qlc.models.enums.Verdict;
import com.qlc.models.messages.SubmissionStreamMessage;
import com.qlc.repositories.SubmissionRepository;
import com.qlc.runners.DockerRunnerResult;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

import static com.qlc.services.SubmissionExecutionTransactions.CompletionOutcome.*;
import static com.qlc.services.SubmissionExecutionTransactions.PreparationOutcome.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
class SubmissionRecoveryIntegrationTest {
  @Autowired EntityManager em;
  @Autowired PlatformTransactionManager transactionManager;
  @Autowired SubmissionRepository repository;
  @Autowired SubmissionExecutionTransactions executions;
  @Autowired SubmissionService service;
  @MockitoBean RedisQueueService queue;

  TransactionTemplate tx;
  long courseId;
  long moduleId;
  long lessonId;
  long taskId;
  List<UUID> submissions = new ArrayList<>();
  static final String SOURCE = "int main() { return 0; }";

  @BeforeEach
  void fixture() {
    tx = new TransactionTemplate(transactionManager);
    tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    tx.executeWithoutResult(status -> {
      Course course = new Course();
      course.setName("Recovery integration test");
      course.setDescription("Test");
      course.setPrice(BigDecimal.ZERO);
      course.setPriceInStars(BigDecimal.ZERO);
      em.persist(course);
      courseId = course.getId();
      Module module = new Module();
      module.setCourse(course);
      module.setName("Test");
      module.setDescription("Test");
      em.persist(module);
      moduleId = module.getId();
      Lesson lesson = new Lesson();
      lesson.setModule(module);
      lesson.setName("Test");
      lesson.setDescription("Test");
      em.persist(lesson);
      lessonId = lesson.getId();
      CodeTask task = new CodeTask();
      task.setLesson(lesson);
      task.setStatementMd("Test");
      task.setTestCases("[{\"input\":\"\",\"output\":\"\"}]");
      em.persist(task);
      taskId = task.getId();
    });
  }

  @AfterEach
  void cleanup() {
    tx.executeWithoutResult(status -> {
      for (UUID id : submissions) repository.deleteById(id);
      repository.flush();
      em.remove(em.find(CodeTask.class, taskId));
      em.flush();
      em.remove(em.find(Lesson.class, lessonId));
      em.flush();
      em.remove(em.find(Module.class, moduleId));
      em.flush();
      em.remove(em.find(Course.class, courseId));
    });
  }

  @Test
  void concurrentDeliveriesStartExactlyOneAttempt() throws Exception {
    UUID id = queued();
    CountDownLatch ready = new CountDownLatch(2);
    CountDownLatch start = new CountDownLatch(1);
    try (var executor = Executors.newFixedThreadPool(2)) {
      java.util.concurrent.Callable<SubmissionExecutionTransactions.Preparation> prepare = () -> {
        ready.countDown();
        assertThat(start.await(5, TimeUnit.SECONDS)).isTrue();
        return executions.prepare(message(id));
      };
      var first = executor.submit(prepare);
      var second = executor.submit(prepare);
      assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
      start.countDown();
      assertThat(List.of(first.get(10, TimeUnit.SECONDS).outcome(), second.get(10, TimeUnit.SECONDS).outcome()))
          .containsExactlyInAnyOrder(READY, ALREADY_PROCESSING);
    }
    Submission current = read(id);
    assertThat(current.getRetryCount()).isEqualTo(1);
    assertThat(current.getStartedAt()).isNotNull();
    assertThat(current.getExecutionToken()).isNotNull();
  }

  @Test
  void recoveryPublishesCommittedStateAndFencesLateCompletionAndFailure() {
    UUID id = queued();
    var old = executions.prepare(message(id));
    edit(id, s -> s.setStartedAt(LocalDateTime.now().minusMinutes(20)));
    doAnswer(invocation -> {
      Submission committed = read(id);
      assertThat(committed.getStatus()).isEqualTo(SubmissionStatus.QUEUED);
      assertThat(committed.getExecutionToken()).isNull();
      return null;
    }).when(queue).pushToStream(any());
    service.recoverStuckSubmissions();
    verify(queue).pushToStream(argThat(s -> s.getId().equals(id)));
    var replacement = executions.prepare(message(id));
    assertThat(replacement.executionToken()).isNotEqualTo(old.executionToken());
    assertThat(executions.complete(id, old.executionToken(), result(Verdict.WA))).isEqualTo(STALE_ATTEMPT);
    executions.retryExecution(id, old.executionToken());
    assertThat(executions.markInfrastructureFailure(id, "poison duplicate")).isFalse();
    assertThat(read(id).getExecutionToken()).isEqualTo(replacement.executionToken());
    assertThat(read(id).getStatus()).isEqualTo(SubmissionStatus.COMPILING);
    assertThat(executions.complete(id, replacement.executionToken(), result(Verdict.AC))).isEqualTo(COMPLETED);
    assertThat(executions.complete(id, old.executionToken(), result(Verdict.WA))).isEqualTo(SubmissionExecutionTransactions.CompletionOutcome.ALREADY_TERMINAL);
    assertThat(read(id).getVerdict()).isEqualTo(Verdict.AC);
  }

  @Test
  void recoversCompilingRunningAndLegacyAttemptsButLeavesFreshAndTerminalOnes() {
    UUID compiling = queued();
    UUID running = queued();
    UUID legacy = queued();
    UUID fresh = queued();
    UUID terminal = queued();
    for (UUID id : List.of(compiling, running, fresh, terminal)) executions.prepare(message(id));
    edit(compiling, s -> s.setStartedAt(LocalDateTime.now().minusMinutes(20)));
    edit(running, s -> {
      s.setStatus(SubmissionStatus.RUNNING);
      s.setStartedAt(LocalDateTime.now().minusMinutes(20));
    });
    edit(legacy, s -> {
      s.setStatus(SubmissionStatus.COMPILING);
      s.setStartedAt(null);
      s.setCreatedAt(LocalDateTime.now().minusDays(1));
    });
    edit(terminal, s -> {
      s.setStatus(SubmissionStatus.FINISHED);
      s.setVerdict(Verdict.AC);
      s.setStartedAt(LocalDateTime.now().minusMinutes(20));
    });
    service.recoverStuckSubmissions();
    for (UUID id : List.of(compiling, running, legacy)) {
      assertThat(read(id).getStatus()).isEqualTo(SubmissionStatus.QUEUED);
      assertThat(read(id).getStartedAt()).isNull();
      assertThat(read(id).getExecutionToken()).isNull();
    }
    assertThat(read(fresh).getStatus()).isEqualTo(SubmissionStatus.COMPILING);
    assertThat(read(terminal).getVerdict()).isEqualTo(Verdict.AC);
    verify(queue, times(3)).pushToStream(any());
  }

  @Test
  void redisOutageDoesNotRollbackRecoveryAndNextScanRetries() {
    UUID id = queued();
    executions.prepare(message(id));
    edit(id, s -> s.setStartedAt(LocalDateTime.now().minusMinutes(20)));
    doThrow(new IllegalStateException("Redis unavailable")).when(queue).pushToStream(any());
    service.recoverStuckSubmissions();
    assertThat(read(id).getStatus()).isEqualTo(SubmissionStatus.QUEUED);
    edit(id, s -> s.setQueuedAt(LocalDateTime.now().minusSeconds(20)));
    doNothing().when(queue).pushToStream(any());
    service.recoverStuckSubmissions();
    verify(queue, times(2)).pushToStream(any());
  }

  @Test
  void retryLimitCountsStartsAndSurvivesRecovery() {
    UUID id = queued();
    for (int attempt = 1; attempt <= 3; attempt++) {
      assertThat(executions.prepare(message(id)).outcome()).isEqualTo(READY);
      assertThat(executions.prepare(message(id)).outcome()).isEqualTo(ALREADY_PROCESSING);
      assertThat(read(id).getRetryCount()).isEqualTo(attempt);
      edit(id, s -> s.setStartedAt(LocalDateTime.now().minusMinutes(20)));
      service.recoverStuckSubmissions();
    }
    assertThat(executions.prepare(message(id)).outcome()).isEqualTo(SubmissionExecutionTransactions.PreparationOutcome.ALREADY_TERMINAL);
    assertThat(read(id).getStatus()).isEqualTo(SubmissionStatus.INFRA_ERROR);
    assertThat(read(id).getRetryCount()).isEqualTo(3);
  }

  @Test
  void recoveryDoesNotStarveBacklogBeyondOneBatch() {
    for (int i = 0; i < 55; i++) {
      UUID id = queued();
      edit(id, s -> s.setQueuedAt(LocalDateTime.now().minusMinutes(1)));
    }
    service.recoverStuckSubmissions();
    verify(queue, times(50)).pushToStream(any());
    service.recoverStuckSubmissions();
    verify(queue, times(55)).pushToStream(any());
  }

  UUID queued() {
    UUID id = tx.execute(status -> {
      Submission s = new Submission();
      s.setTask(em.find(CodeTask.class, taskId));
      s.setLanguage("CPP23");
      s.setSourceCode(SOURCE);
      s.setStatus(SubmissionStatus.QUEUED);
      em.persist(s);
      em.flush();
      s.setCreatedAt(LocalDateTime.now().minusDays(1));
      return s.getId();
    });
    submissions.add(id);
    return id;
  }

  void edit(UUID id, Consumer<Submission> edit) {
    tx.executeWithoutResult(status -> edit.accept(em.find(Submission.class, id)));
  }

  Submission read(UUID id) {
    return tx.execute(status -> repository.findById(id).orElseThrow());
  }

  SubmissionStreamMessage message(UUID id) {
    return new SubmissionStreamMessage("1", id, taskId, SOURCE);
  }

  DockerRunnerResult result(Verdict verdict) {
    return new DockerRunnerResult(verdict, 1, 1, 5, 2048L, "OK");
  }
}
