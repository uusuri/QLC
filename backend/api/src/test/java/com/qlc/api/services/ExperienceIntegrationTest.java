package com.qlc.api.services;

import com.qlc.api.models.requests.AnswerRequest;
import com.qlc.api.security.UserDetailsImpl;
import com.qlc.shared.model.entities.*;
import com.qlc.shared.model.enums.*;
import com.qlc.shared.services.ExperienceService;
import com.qlc.worker.execution.SubmissionExecutionTransactions;
import com.qlc.worker.runners.DockerRunnerResult;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.WebApplicationContext;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@Import(SubmissionExecutionTransactions.class)
class ExperienceIntegrationTest {
  @Autowired EntityManager em;
  @Autowired PlatformTransactionManager manager;
  @Autowired WebApplicationContext context;
  @Autowired InstantAnswerService answers;
  @Autowired ExperienceService experience;
  @Autowired SubmissionExecutionTransactions executions;
  TransactionTemplate tx;
  MockMvc mvc;
  User learner;
  long courseId, moduleId, lessonId, numericId, testId, codeId;

  @BeforeEach
  void fixture() {
    tx = new TransactionTemplate(manager);
    mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    tx.executeWithoutResult(status -> {
      learner = new User();
      learner.setUsername("xp-" + UUID.randomUUID());
      learner.setEmail(learner.getUsername() + "@example.test");
      learner.setPassword("test-only");
      learner.setRole(Role.ROLE_USER);
      learner.setRegistrationDate(LocalDateTime.now());
      em.persist(learner);
      Course course = new Course();
      course.setName("XP course"); course.setDescription("Test");
      course.setPrice(BigDecimal.ZERO); course.setPriceInStars(BigDecimal.ZERO);
      em.persist(course); courseId = course.getId();
      var module = new com.qlc.shared.model.entities.Module();
      module.setCourse(course); module.setName("Test"); module.setDescription("Test");
      em.persist(module); moduleId = module.getId();
      Lesson lesson = new Lesson();
      lesson.setModule(module); lesson.setName("Test"); lesson.setDescription("Test");
      em.persist(lesson); lessonId = lesson.getId();
      NumericTask numeric = new NumericTask(); numeric.setCorrectNumericAnswer(BigDecimal.TEN);
      numericId = task(numeric, lesson, 1);
      TestTask quiz = new TestTask(); quiz.setOptions(List.of("A", "B")); quiz.setCorrectOptionIndexes(List.of(0));
      testId = task(quiz, lesson, 2);
      CodeTask code = new CodeTask(); code.setTestCases("[{\"input\":\"\",\"output\":\"1\"}]");
      codeId = task(code, lesson, 3);
    });
  }

  private long task(Task task, Lesson lesson, int difficulty) {
    task.setLesson(lesson); task.setStatementMd("Test"); task.setDifficulty((short) difficulty);
    em.persist(task); return task.getId();
  }

  @AfterEach
  void cleanup() {
    tx.executeWithoutResult(status -> {
      em.createQuery("delete from TaskExperience r where r.userId = :id").setParameter("id", learner.getId()).executeUpdate();
      em.createQuery("delete from Submission s where s.user.id = :id").setParameter("id", learner.getId()).executeUpdate();
      for (long id : List.of(numericId, testId, codeId)) em.remove(em.find(Task.class, id));
      em.flush(); em.remove(em.find(Lesson.class, lessonId));
      em.flush(); em.remove(em.find(com.qlc.shared.model.entities.Module.class, moduleId));
      em.flush(); em.remove(em.find(Course.class, courseId));
      em.remove(em.find(User.class, learner.getId()));
    });
  }

  @Test
  void rewardsNumericAndTestOnceAndKeepsAwardWhenDifficultyChanges() throws Exception {
    assertThat(answers.submit(numericId, new AnswerRequest(null, "11"), learner.getId()).awardedXp()).isZero();
    assertThat(experience.summary(learner.getId()).totalXp()).isZero();
    var first = answers.submit(numericId, new AnswerRequest(null, "10"), learner.getId());
    assertThat(first.awardedXp()).isEqualTo(10);
    assertThat(answers.submit(testId, new AnswerRequest(List.of(0), null), learner.getId()).awardedXp()).isEqualTo(20);
    tx.executeWithoutResult(status -> em.find(Task.class, numericId).setDifficulty((short) 3));
    var repeated = answers.submit(numericId, new AnswerRequest(null, "10"), learner.getId());
    assertThat(repeated.awardedXp()).isZero();
    assertThat(answers.submit(testId, new AnswerRequest(List.of(0), null), learner.getId()).awardedXp()).isZero();
    assertThat(experience.summary(learner.getId()).totalXp()).isEqualTo(30);
    mvc.perform(get("/api/submissions/{id}", first.id()).with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isOk()).andExpect(jsonPath("awardedXp").value(10));
    mvc.perform(get("/api/submissions/{id}", repeated.id()).with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isOk()).andExpect(jsonPath("awardedXp").value(0));
  }

  @Test
  void workerOnlyRewardsCommittedAcNotStaleAttemptWaOrExcludedHistory() {
    UUID token = UUID.randomUUID();
    UUID id = running(token, true);
    executions.complete(id, UUID.randomUUID(), result(Verdict.AC));
    assertThat(experience.summary(learner.getId()).totalXp()).isZero();
    executions.complete(id, token, result(Verdict.WA));
    assertThat(experience.summary(learner.getId()).totalXp()).isZero();
    id = running(token, false);
    executions.complete(id, token, result(Verdict.AC));
    assertThat(experience.summary(learner.getId()).totalXp()).isZero();
    id = running(token, true);
    executions.complete(id, token, result(Verdict.AC));
    assertThat(experience.awardedForSubmission(learner.getId(), codeId, id)).isEqualTo(30);
    executions.complete(id, token, result(Verdict.AC));
    UUID repeated = running(token, true);
    executions.complete(repeated, token, result(Verdict.AC));
    assertThat(experience.awardedForSubmission(learner.getId(), codeId, repeated)).isZero();
    assertThat(experience.summary(learner.getId()).totalXp()).isEqualTo(30);
  }

  @Test
  void answerAndRewardRollbackTogether() {
    assertThatThrownBy(() -> tx.executeWithoutResult(status -> {
      answers.submit(numericId, new AnswerRequest(null, "10"), learner.getId());
      throw new IllegalStateException("rollback");
    })).isInstanceOf(IllegalStateException.class);
    assertThat(experience.summary(learner.getId()).totalXp()).isZero();
    Long remaining = tx.execute(status -> em.createQuery("select count(s) from Submission s where s.user.id=:id", Long.class)
        .setParameter("id", learner.getId()).getSingleResult());
    assertThat(remaining).isZero();
  }

  @Test
  void concurrentAcceptedSubmissionsGrantOnlyOneReward() throws Exception {
    UUID token = UUID.randomUUID();
    UUID first = running(token, true), second = running(token, true);
    CountDownLatch ready = new CountDownLatch(2), start = new CountDownLatch(1);
    try (var executor = Executors.newFixedThreadPool(2)) {
      var futures = List.of(first, second).stream().map(id -> executor.submit(() -> {
        ready.countDown();
        if (!start.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("start timeout");
        return executions.complete(id, token, result(Verdict.AC));
      })).toList();
      assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue(); start.countDown();
      for (var future : futures) assertThat(future.get(10, TimeUnit.SECONDS))
          .isEqualTo(SubmissionExecutionTransactions.CompletionOutcome.COMPLETED);
    }
    assertThat(experience.summary(learner.getId()).totalXp()).isEqualTo(30);
  }

  @Test
  void profileEndpointRequiresAuthenticationAndDoesNotCachePersonalExperience() throws Exception {
    mvc.perform(get("/api/users/me/experience")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/users/me/experience").with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("level").value(1)).andExpect(jsonPath("totalXp").value(0))
        .andExpect(jsonPath("currentLevelXp").value(0)).andExpect(jsonPath("xpRequiredForLevel").value(100))
        .andExpect(jsonPath("xpRemaining").value(100));
    answers.submit(numericId, new AnswerRequest(null, "10"), learner.getId());
    mvc.perform(get("/api/users/me/experience?userId=0").with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isOk()).andExpect(jsonPath("totalXp").value(10));
  }

  private UUID running(UUID token, boolean counts) {
    return tx.execute(status -> {
      Submission submission = new Submission();
      submission.setTask(em.find(Task.class, codeId)); submission.setUser(em.find(User.class, learner.getId()));
      submission.setLanguage("CPP23"); submission.setSourceCode("int main() {}");
      submission.setStatus(SubmissionStatus.COMPILING); submission.setExecutionToken(token);
      submission.setCountsForProgress(counts); em.persist(submission); return submission.getId();
    });
  }

  private DockerRunnerResult result(Verdict verdict) {
    return new DockerRunnerResult(verdict, 1, 1, 1, 1024L, "Test");
  }
}
