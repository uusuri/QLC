package com.qlc.api.controllers;

import com.qlc.api.security.UserDetailsImpl;
import com.qlc.shared.model.entities.*;
import com.qlc.shared.model.enums.Role;
import com.qlc.shared.runs.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @ActiveProfiles("test") @Transactional
class CodeRunIntegrationTest {
  @Autowired EntityManager em;
  @Autowired WebApplicationContext context;
  @MockitoBean CodeRunStore store;
  MockMvc mvc;
  User learner;
  CodeTask task;
  String payload = """
      {"language":"CPP23","sourceCode":"int main() {}","tests":[{"input":"","output":null}]}
      """;

  @BeforeEach void fixture() {
    mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    learner = new User(); learner.setUsername("run-" + UUID.randomUUID()); learner.setEmail(learner.getUsername() + "@example.test");
    learner.setPassword("hash"); learner.setRole(Role.ROLE_USER);
    learner.setRegistrationDate(java.time.LocalDateTime.now()); em.persist(learner);
    var course = new Course(); course.setName("Run tests"); course.setDescription("Test");
    course.setPrice(BigDecimal.ZERO); course.setPriceInStars(BigDecimal.ZERO); course.setPublished(true); em.persist(course);
    var module = new com.qlc.shared.model.entities.Module(); module.setCourse(course); module.setName("Test"); module.setDescription("Test"); em.persist(module);
    var lesson = new Lesson(); lesson.setModule(module); lesson.setName("Test"); lesson.setDescription("Test"); lesson.setPublished(true); em.persist(lesson);
    task = new CodeTask(); task.setLesson(lesson); task.setStatementMd("Public"); task.setTestCases("PRIVATE_TESTS"); em.persist(task); em.flush();
    when(store.enqueue(any())).thenReturn(1L);
  }

  @Test void acceptsPublicTestsWithoutWritingSubmissionsOrExperience() throws Exception {
    long submissions = count("Submission"), experience = count("TaskExperience");
    mvc.perform(post("/api/tasks/{id}/runs", task.getId()).with(user(UserDetailsImpl.build(learner)))
        .contentType("application/json").content(payload))
        .andExpect(status().isAccepted()).andExpect(jsonPath("status").value("QUEUED"))
        .andExpect(header().string("Cache-Control", "private, no-store"))
        .andExpect(jsonPath("sourceCode").doesNotExist()).andExpect(jsonPath("testCases").doesNotExist());
    assertThat(count("Submission")).isEqualTo(submissions);
    assertThat(count("TaskExperience")).isEqualTo(experience);
    verify(store).enqueue(argThat(job -> job.tests().equals(List.of(new CodeRunJob.TestCase("", null)))));
  }

  @Test void requiresAuthenticationAndRejectsNullTests() throws Exception {
    mvc.perform(post("/api/tasks/{id}/runs", task.getId()).contentType("application/json").content(payload))
        .andExpect(status().isUnauthorized());
    mvc.perform(get("/api/runs/{id}", UUID.randomUUID())).andExpect(status().isUnauthorized());
    mvc.perform(post("/api/tasks/{id}/runs", task.getId()).with(user(UserDetailsImpl.build(learner)))
        .contentType("application/json").content(payload.replace("{\"input\":\"\",\"output\":null}", "null")))
        .andExpect(status().isBadRequest());
    verify(store, never()).enqueue(any());
  }

  @Test void rejectsUnpublishedTaskAndReturns429OnBackpressure() throws Exception {
    when(store.enqueue(any())).thenReturn(0L);
    mvc.perform(post("/api/tasks/{id}/runs", task.getId()).with(user(UserDetailsImpl.build(learner)))
        .contentType("application/json").content(payload)).andExpect(status().isTooManyRequests());
    task.getLesson().setPublished(false); em.flush();
    mvc.perform(post("/api/tasks/{id}/runs", task.getId()).with(user(UserDetailsImpl.build(learner)))
        .contentType("application/json").content(payload)).andExpect(status().isForbidden());
  }

  @Test void missingOrForeignRunIs404AndOnlyUsesAuthenticatedOwner() throws Exception {
    UUID id = UUID.randomUUID();
    mvc.perform(get("/api/runs/{id}?userId=999", id).with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isNotFound());
    verify(store).find(id, learner.getId());
  }

  long count(String entity) { return em.createQuery("select count(e) from " + entity + " e", Long.class).getSingleResult(); }
}
