package com.qlc.controllers;

import com.qlc.models.entities.Course;
import com.qlc.models.entities.Lesson;
import com.qlc.security.UserDetailsImpl;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.ObjectMapper;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class TestTaskCrudIntegrationTest {
  @Autowired EntityManager em;
  @Autowired PlatformTransactionManager transactionManager;
  @Autowired WebApplicationContext context;
  @Autowired ObjectMapper mapper;
  MockMvc mvc;
  TransactionTemplate tx;
  long courseId;
  long lessonId;
  final UserDetailsImpl admin = UserDetailsImpl.fromToken(100L, "test-admin", "admin@example.test", "ROLE_ADMIN");
  final UserDetailsImpl learner = UserDetailsImpl.fromToken(101L, "test-learner", "learner@example.test", "ROLE_USER");

  // Intentionally no outer @Transactional: JSON serialization must work after the service closes its transaction.
  @BeforeEach
  void setup() {
    mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    tx = new TransactionTemplate(transactionManager);
    tx.executeWithoutResult(status -> {
      Course course = new Course();
      course.setName("TEST CRUD " + UUID.randomUUID());
      course.setDescription("Test");
      course.setPrice(BigDecimal.ZERO);
      course.setPriceInStars(BigDecimal.ZERO);
      em.persist(course);
      courseId = course.getId();
      com.qlc.models.entities.Module module = new com.qlc.models.entities.Module();
      module.setCourse(course);
      module.setName("Test");
      module.setDescription("Test");
      em.persist(module);
      Lesson lesson = new Lesson();
      lesson.setModule(module);
      lesson.setName("Test");
      lesson.setDescription("Test");
      lesson.setContentMd("Theory");
      em.persist(lesson);
      lessonId = lesson.getId();
    });
  }

  @AfterEach
  void cleanup() {
    tx.executeWithoutResult(status -> em.remove(em.find(Course.class, courseId)));
  }

  @Test
  void createThenRefreshAdminListAndOpenTask() throws Exception {
    long id = createTest();
    mvc.perform(get("/api/lessons/{id}/tasks", lessonId).with(user(admin)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].options[0]").value("Первый"))
        .andExpect(jsonPath("$[0].options[2]").value("Третий"))
        .andExpect(jsonPath("$[0].correctOptionIndexes[1]").value(2));
    mvc.perform(get("/api/tasks/{id}", id).with(user(admin)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("options.length()").value(3))
        .andExpect(jsonPath("correctOptionIndexes[0]").value(0));
  }

  @Test
  void learnerCanReadOptionsWithoutPrivateAnswers() throws Exception {
    createTest();
    mvc.perform(get("/api/lessons/{id}/learn", lessonId).with(user(learner)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("tasks[0].options[1]").value("Второй"))
        .andExpect(jsonPath("tasks[0].multipleAnswersAllowed").value(true))
        .andExpect(jsonPath("tasks[0].correctOptionIndexes").doesNotExist());
  }

  @Test
  void updateThenReloadPreservesOrderAndCorrectIndexes() throws Exception {
    long id = createTest();
    mvc.perform(put("/api/tasks/{id}", id).with(user(admin)).contentType(MediaType.APPLICATION_JSON)
        .content("""
            {"taskType":"TEST","statementMd":"Обновлено","options":["Третий","Первый"],"correctOptionIndexes":[1]}
            """))
        .andExpect(status().isOk());
    mvc.perform(get("/api/tasks/{id}", id).with(user(admin)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("options[0]").value("Третий"))
        .andExpect(jsonPath("options[1]").value("Первый"))
        .andExpect(jsonPath("correctOptionIndexes[0]").value(1));
  }

  @Test
  void theoryVariantsSurviveSerializationAndLegacyUpdates() throws Exception {
    mvc.perform(put("/api/lessons/{id}", lessonId).with(user(admin)).contentType(MediaType.APPLICATION_JSON)
        .content("""
            {"name":"Test","description":"Test","contentMd":"Base","contentByLanguage":{"PYTHON312":"Python text","JAVA21":"Java text"}}
            """))
        .andExpect(status().isOk()).andExpect(jsonPath("contentByLanguage.PYTHON312").value("Python text"));
    mvc.perform(put("/api/lessons/{id}", lessonId).with(user(admin)).contentType(MediaType.APPLICATION_JSON)
        .content("{\"name\":\"Test\",\"description\":\"Test\",\"contentMd\":\"Updated base\"}"))
        .andExpect(status().isOk());
    mvc.perform(get("/api/admin/lessons/{id}", lessonId).with(user(admin))).andExpect(status().isOk())
        .andExpect(jsonPath("contentByLanguage.JAVA21").value("Java text"));
    mvc.perform(put("/api/lessons/{id}", lessonId).with(user(admin)).contentType(MediaType.APPLICATION_JSON)
        .content("{\"name\":\"Test\",\"description\":\"Test\",\"contentByLanguage\":{}}"))
        .andExpect(status().isOk()).andExpect(jsonPath("contentByLanguage").isEmpty());
  }

  @Test
  void theoryRejectsUnknownLanguagesAndEmptyVariants() throws Exception {
    for (String variants : new String[]{"{\"UNKNOWN\":\"Text\"}", "{\"JAVA21\":\"   \"}"}) {
      mvc.perform(put("/api/lessons/{id}", lessonId).with(user(admin)).contentType(MediaType.APPLICATION_JSON)
          .content("{\"name\":\"Test\",\"description\":\"Test\",\"contentByLanguage\":" + variants + "}"))
          .andExpect(status().isBadRequest());
    }
    mvc.perform(get("/api/admin/lessons/{id}", lessonId).with(user(admin))).andExpect(status().isOk())
        .andExpect(jsonPath("contentMd").value("Theory"));
  }

  long createTest() throws Exception {
    String response = mvc.perform(post("/api/lessons/{id}/tasks", lessonId).with(user(admin))
        .contentType(MediaType.APPLICATION_JSON).content("""
            {"taskType":"TEST","statementMd":"Выберите варианты","options":["Первый","Второй","Третий"],"correctOptionIndexes":[0,2]}
            """))
        .andExpect(status().isOk()).andExpect(jsonPath("options.length()").value(3))
        .andReturn().getResponse().getContentAsString();
    return mapper.readTree(response).path("id").asLong();
  }
}
