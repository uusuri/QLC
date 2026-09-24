package com.qlc.controllers;

import com.qlc.models.entities.CodeTask;
import com.qlc.models.entities.Course;
import com.qlc.models.entities.Lesson;
import com.qlc.models.entities.User;
import com.qlc.models.enums.Role;
import com.qlc.security.UserDetailsImpl;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.anonymous;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PaidContentAccessIntegrationTest {
  @Autowired EntityManager entityManager;
  @Autowired WebApplicationContext context;
  private MockMvc mvc;
  private User buyer;
  private User stranger;
  private User admin;
  private long courseId;
  private long moduleId;
  private long lessonId;
  private long taskId;

  @BeforeEach
  void setup() {
    mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    buyer = createUser("content-buyer", Role.ROLE_USER);
    stranger = createUser("content-stranger", Role.ROLE_USER);
    admin = createUser("content-admin", Role.ROLE_ADMIN);
    Course course = new Course();
    course.setName("Paid course");
    course.setDescription("Public course description");
    course.setPrice(BigDecimal.TEN);
    course.setPriceInStars(BigDecimal.ONE);
    course.getStudents().add(buyer);
    entityManager.persist(course);
    courseId = course.getId();

    com.qlc.models.entities.Module module = new com.qlc.models.entities.Module();
    module.setName("Module");
    module.setDescription("Public module description");
    module.setCourse(course);
    entityManager.persist(module);
    moduleId = module.getId();

    Lesson lesson = new Lesson();
    lesson.setModule(module);
    lesson.setName("Lesson");
    lesson.setDescription("Public lesson description");
    lesson.setContentMd("paid-lesson-secret");
    entityManager.persist(lesson);
    lessonId = lesson.getId();

    CodeTask task = new CodeTask();
    task.setLesson(lesson);
    task.setStatementMd("paid-task-secret");
    task.setTestCases("private-judge-secret");
    entityManager.persist(task);
    taskId = task.getId();
    entityManager.flush();
    entityManager.clear();
  }

  @Test
  void publicEndpointsReturnOnlyMetadataForEveryRole() throws Exception {
    for (RequestPostProcessor identity : List.of(anonymous(), as(buyer), as(stranger), as(admin))) {
      mvc.perform(get("/api/lessons/{id}", lessonId).with(identity))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.name").value("Lesson"))
          .andExpect(jsonPath("$.contentMd").doesNotExist())
          .andExpect(content().string(not(containsString("paid-lesson-secret"))));
      mvc.perform(get("/api/lessons/{id}/task-outline", lessonId).with(identity))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$[0].id").value(taskId))
          .andExpect(jsonPath("$[0].taskType").value("CODE"))
          .andExpect(jsonPath("$[0].statementMd").doesNotExist())
          .andExpect(content().string(not(containsString("paid-task-secret"))))
          .andExpect(content().string(not(containsString("private-judge-secret"))));
    }
    for (String path : List.of("/api/catalog/courses/" + courseId, "/api/modules/" + moduleId + "/lessons")) {
      mvc.perform(get(path)).andExpect(status().isOk())
          .andExpect(content().string(not(containsString("paid-lesson-secret"))))
          .andExpect(content().string(not(containsString("paid-task-secret"))));
    }
  }

  @Test
  void onlyBuyerCanReadPaidLearningContentAndResponsesAreNotCached() throws Exception {
    mvc.perform(get("/api/lessons/{id}/learn", lessonId))
        .andExpect(status().is4xxClientError());
    assertLearningLocked(stranger);
    mvc.perform(get("/api/lessons/{id}/learn", lessonId).with(as(buyer)))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "private, no-store"))
        .andExpect(jsonPath("$.lesson.contentMd").value("paid-lesson-secret"))
        .andExpect(jsonPath("$.tasks[0].statementMd").value("paid-task-secret"))
        .andExpect(jsonPath("$.tasks[0].testCases").doesNotExist())
        .andExpect(content().string(not(containsString("private-judge-secret"))));
    // A buyer request must not make the same content available to the next user.
    assertLearningLocked(stranger);
  }

  @Test
  void freePublishedContentRemainsAvailableButStarsOnlyCourseIsPaid() throws Exception {
    Course course = entityManager.find(Course.class, courseId);
    course.setPrice(BigDecimal.ZERO);
    assertLearningLocked(stranger);
    course.setPriceInStars(BigDecimal.ZERO);
    mvc.perform(get("/api/lessons/{id}/learn", lessonId).with(as(stranger)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.lesson.contentMd").value("paid-lesson-secret"))
        .andExpect(jsonPath("$.tasks[0].statementMd").value("paid-task-secret"));
  }

  @Test
  void hiddenLessonOrCourseCannotBeReadEvenAfterPurchase() throws Exception {
    Course course = entityManager.find(Course.class, courseId);
    course.setPublished(false);
    assertLearningLocked(buyer);
    assertOutlineEmpty();
    course.setPublished(true);
    entityManager.find(Lesson.class, lessonId).setPublished(false);
    assertLearningLocked(buyer);
    assertOutlineEmpty();
  }

  @Test
  void adminCanEditFullDraftsButOtherUsersCannotUseAdminRoutes() throws Exception {
    entityManager.find(Lesson.class, lessonId).setPublished(false);
    mvc.perform(get("/api/admin/lessons/{id}", lessonId).with(as(admin)))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "private, no-store"))
        .andExpect(jsonPath("$.contentMd").value("paid-lesson-secret"));
    mvc.perform(get("/api/lessons/{id}/tasks", lessonId).with(as(admin)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].statementMd").value("paid-task-secret"));
    mvc.perform(get("/api/tasks/{id}", taskId).with(as(admin)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.testCases").value("private-judge-secret"));
    for (String path : List.of("/api/admin/lessons/" + lessonId,
        "/api/lessons/" + lessonId + "/tasks", "/api/tasks/" + taskId)) {
      mvc.perform(get(path)).andExpect(status().is4xxClientError())
          .andExpect(content().string(not(containsString("paid-"))));
      mvc.perform(get(path).with(as(buyer))).andExpect(status().isForbidden())
          .andExpect(content().string(not(containsString("paid-"))));
    }
  }

  @Test
  void missingPublicLessonAndOutlineReturn404() throws Exception {
    mvc.perform(get("/api/lessons/9223372036854775807"))
        .andExpect(status().isNotFound());
    mvc.perform(get("/api/lessons/9223372036854775807/task-outline"))
        .andExpect(status().isNotFound());
  }

  private void assertLearningLocked(User account) throws Exception {
    mvc.perform(get("/api/lessons/{id}/learn", lessonId).with(as(account)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.lesson.contentMd").doesNotExist())
        .andExpect(jsonPath("$.tasks").isEmpty())
        .andExpect(content().string(not(containsString("paid-lesson-secret"))))
        .andExpect(content().string(not(containsString("paid-task-secret"))));
  }

  private void assertOutlineEmpty() throws Exception {
    mvc.perform(get("/api/lessons/{id}/task-outline", lessonId))
        .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
  }

  private RequestPostProcessor as(User account) {
    return user(UserDetailsImpl.build(account));
  }

  private User createUser(String name, Role role) {
    User account = new User();
    account.setUsername(name);
    account.setEmail(name + "@example.com");
    account.setPassword("unused");
    account.setRole(role);
    account.setRegistrationDate(LocalDateTime.now());
    entityManager.persist(account);
    return account;
  }
}
