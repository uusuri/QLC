package com.qlc.api.controllers;

import com.qlc.api.security.UserDetailsImpl;
import com.qlc.shared.model.entities.*;
import com.qlc.shared.model.enums.*;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SubmissionHistoryIntegrationTest {
  @Autowired EntityManager em;
  @Autowired WebApplicationContext context;
  MockMvc mvc;
  User learner, other, admin;
  Course course;
  Lesson lesson;
  CodeTask code;
  NumericTask numeric;
  TestTask quiz;

  @BeforeEach
  void fixture() {
    mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    learner = account(Role.ROLE_USER); other = account(Role.ROLE_USER); admin = account(Role.ROLE_ADMIN);
    course = new Course(); course.setName("History"); course.setDescription("Test");
    course.setPrice(BigDecimal.ZERO); course.setPriceInStars(BigDecimal.ZERO); em.persist(course);
    var module = new com.qlc.shared.model.entities.Module();
    module.setCourse(course); module.setName("Test"); module.setDescription("Test"); em.persist(module);
    lesson = new Lesson(); lesson.setModule(module); lesson.setName("Test"); lesson.setDescription("Test"); em.persist(lesson);
    code = new CodeTask(); code.setTestCases("PRIVATE_JUDGE_INPUT"); saveTask(code);
    numeric = new NumericTask(); numeric.setCorrectNumericAnswer(new BigDecimal("777")); saveTask(numeric);
    quiz = new TestTask(); quiz.setOptions(List.of("A", "B", "C")); quiz.setCorrectOptionIndexes(List.of(1)); saveTask(quiz);
  }

  @Test
  void returnsOnlyOwnTaskHistoryInStableBoundedPagesWithoutPayloads() throws Exception {
    List<UUID> ids = new ArrayList<>();
    for (int i = 0; i < 23; i++) {
      Submission s = attempt(code, learner, "source-" + i, null, new UUID(1, i + 1));
      s.setCreatedAt(LocalDateTime.of(2026, 1, 1, 12, 0).plusSeconds(i / 3));
      ids.add(s.getId());
    }
    attempt(code, other, "OTHER_USER_SOURCE", null);
    attempt(numeric, learner, null, "123");
    em.flush();
    mvc.perform(own("/api/tasks/{id}/submissions", code.getId()))
        .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("page").value(0)).andExpect(jsonPath("hasNext").value(true))
        .andExpect(jsonPath("items", hasSize(20)))
        .andExpect(jsonPath("items[0].id").value(ids.getLast().toString()))
        .andExpect(jsonPath("items[*].taskId", everyItem(is(code.getId().intValue()))))
        .andExpect(jsonPath("items[*].sourceCode").doesNotExist())
        .andExpect(jsonPath("items[*].submittedAnswer").doesNotExist())
        .andExpect(jsonPath("items[*].safeMessage").doesNotExist())
        .andExpect(content().string(not(containsString("OTHER_USER_SOURCE"))))
        .andExpect(content().string(not(containsString("PRIVATE_JUDGE_INPUT"))));
    mvc.perform(own("/api/tasks/{id}/submissions?page=1", code.getId()))
        .andExpect(status().isOk()).andExpect(jsonPath("hasNext").value(false))
        .andExpect(jsonPath("items", hasSize(3))).andExpect(jsonPath("items[0].id").value(ids.get(2).toString()));
    mvc.perform(own("/api/tasks/{id}/submissions?page=2", code.getId()))
        .andExpect(status().isOk()).andExpect(jsonPath("items", hasSize(0))).andExpect(jsonPath("hasNext").value(false));
  }

  @Test
  void returnsOriginalCodeOnlyForItsOwnerAndMatchingTask() throws Exception {
    String source = "#include <iostream>\nint main() { std::cout << \"<script>\"; }\n";
    Submission own = attempt(code, learner, source, null);
    Submission foreign = attempt(code, other, "PRIVATE_OTHER_SOURCE", null);
    em.flush();
    mvc.perform(own("/api/tasks/{task}/submissions/{id}", code.getId(), own.getId()))
        .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("sourceCode").value(source)).andExpect(jsonPath("language").value("CPP23"))
        .andExpect(jsonPath("testCases").doesNotExist()).andExpect(jsonPath("safeMessage").doesNotExist());
    mvc.perform(own("/api/tasks/{task}/submissions/{id}", code.getId(), foreign.getId())).andExpect(status().isNotFound());
    mvc.perform(get("/api/tasks/{task}/submissions/{id}", code.getId(), own.getId())
        .with(user(UserDetailsImpl.build(admin)))).andExpect(status().isNotFound());
    mvc.perform(own("/api/tasks/{task}/submissions/{id}", numeric.getId(), own.getId())).andExpect(status().isNotFound());
    mvc.perform(own("/api/tasks/{task}/submissions/{id}", code.getId(), UUID.randomUUID())).andExpect(status().isNotFound());
  }

  @Test
  void preservesNumericPrecisionAndTestIndicesWithoutReturningCorrectAnswers() throws Exception {
    Submission number = attempt(numeric, learner, null, "12345678901234567890.000100");
    Submission test = attempt(quiz, learner, null, "[0,2]");
    em.flush();
    mvc.perform(own("/api/tasks/{task}/submissions/{id}", numeric.getId(), number.getId()))
        .andExpect(status().isOk()).andExpect(jsonPath("submittedAnswer").value("12345678901234567890.000100"))
        .andExpect(jsonPath("correctNumericAnswer").doesNotExist());
    mvc.perform(own("/api/tasks/{task}/submissions/{id}", quiz.getId(), test.getId()))
        .andExpect(status().isOk()).andExpect(jsonPath("submittedAnswer").value("[0,2]"))
        .andExpect(jsonPath("correctOptionIndexes").doesNotExist()).andExpect(jsonPath("options").doesNotExist());
  }

  @Test
  void includesPendingDemoAndOldProgressButDoesNotChangeSubmissions() throws Exception {
    for (SubmissionStatus status : List.of(SubmissionStatus.QUEUED, SubmissionStatus.COMPILING,
        SubmissionStatus.DEMO, SubmissionStatus.INFRA_ERROR, SubmissionStatus.FINISHED)) {
      Submission s = attempt(code, learner, "Test", null);
      s.setStatus(status); s.setCountsForProgress(false);
    }
    em.flush();
    Long before = em.createQuery("select count(s) from Submission s", Long.class).getSingleResult();
    mvc.perform(own("/api/tasks/{id}/submissions?userId=" + other.getId(), code.getId()))
        .andExpect(status().isOk()).andExpect(jsonPath("items", hasSize(5)));
    assertThat(em.createQuery("select count(s) from Submission s", Long.class).getSingleResult()).isEqualTo(before);
  }

  @Test
  void validatesPageAndRequiresAuthenticationAndTaskAccess() throws Exception {
    mvc.perform(get("/api/tasks/{id}/submissions", code.getId())).andExpect(status().isUnauthorized());
    for (String page : List.of("-1", "10001", "not-a-number"))
      mvc.perform(own("/api/tasks/{id}/submissions?page=" + page, code.getId())).andExpect(status().isBadRequest());
    mvc.perform(own("/api/tasks/999999999/submissions")).andExpect(status().isNotFound());
    mvc.perform(own("/api/tasks/{id}/submissions", code.getId())).andExpect(status().isOk())
        .andExpect(jsonPath("items", hasSize(0))).andExpect(jsonPath("hasNext").value(false));
    course.setPrice(BigDecimal.TEN); em.flush();
    mvc.perform(own("/api/tasks/{id}/submissions", code.getId())).andExpect(status().isForbidden());
    course.setPrice(BigDecimal.ZERO); lesson.setPublished(false); em.flush();
    mvc.perform(own("/api/tasks/{id}/submissions", code.getId())).andExpect(status().isForbidden());
  }

  private User account(Role role) {
    User user = new User(); user.setUsername("history-" + UUID.randomUUID());
    user.setEmail(user.getUsername() + "@example.test"); user.setPassword("Test"); user.setRole(role);
    user.setRegistrationDate(LocalDateTime.now()); em.persist(user); return user;
  }

  private void saveTask(Task task) { task.setLesson(lesson); task.setStatementMd("Test"); em.persist(task); }

  private Submission attempt(Task task, User user, String source, String answer) {
    return attempt(task, user, source, answer, UUID.randomUUID());
  }

  private Submission attempt(Task task, User user, String source, String answer, UUID id) {
    Submission s = new Submission(); s.setId(id); s.setTask(task); s.setUser(user); s.setSourceCode(source); s.setSubmittedAnswer(answer);
    s.setLanguage(source == null ? null : "CPP23"); s.setStatus(SubmissionStatus.FINISHED); s.setVerdict(Verdict.WA);
    s.setExecutionTime(source == null ? null : 17L); s.setMemoryUsed(source == null ? null : 2048L);
    s.setSafeMessage("PRIVATE_JUDGE_DIAGNOSTICS"); em.persist(s); return s;
  }

  private MockHttpServletRequestBuilder own(String path, Object... args) {
    return get(path, args).with(user(UserDetailsImpl.build(learner)));
  }
}
