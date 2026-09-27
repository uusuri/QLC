package com.qlc.controllers;

import com.qlc.models.entities.*;
import com.qlc.models.enums.Role;
import com.qlc.models.enums.SubmissionStatus;
import com.qlc.repositories.SubmissionRepository;
import com.qlc.security.UserDetailsImpl;
import com.qlc.services.RedisQueueService;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CourseLanguageIntegrationTest {
  @Autowired EntityManager em;
  @Autowired WebApplicationContext context;
  @Autowired SubmissionRepository submissions;
  @MockitoBean RedisQueueService queue;
  MockMvc mvc;
  User learner;
  User other;
  Course course;
  CodeTask task;

  @BeforeEach
  void setup() {
    mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    learner = learner("languages-first");
    other = learner("languages-second");
    course = new Course();
    course.setName("Multilingual course");
    course.setDescription("Test");
    course.setPrice(BigDecimal.ZERO);
    course.setPriceInStars(BigDecimal.ZERO);
    course.setMultilingual(true);
    course.setAvailableLanguages(new HashSet<>(com.qlc.services.CourseLanguageService.CONFIGURABLE_LANGUAGES));
    em.persist(course);
    com.qlc.models.entities.Module module = new com.qlc.models.entities.Module();
    module.setCourse(course);
    module.setName("Module");
    module.setDescription("Test");
    em.persist(module);
    Lesson lesson = new Lesson();
    lesson.setModule(module);
    lesson.setName("Lesson");
    lesson.setDescription("Test");
    lesson.setPublished(true);
    em.persist(lesson);
    task = new CodeTask();
    task.setLesson(lesson);
    task.setStatementMd("Task");
    em.persist(task);
    em.flush();
  }

  @Test
  void firstVisitHasNoChoice_selectionPersistsAndRemainsPersonal() throws Exception {
    mvc.perform(auth(get(path()), learner)).andExpect(status().isOk())
        .andExpect(jsonPath("multilingual").value(true))
        .andExpect(jsonPath("availableLanguages.length()").value(10))
        .andExpect(jsonPath("selectedLanguage").doesNotExist());
    choose("PYTHON311", learner);
    choose("JAVA21", other);
    choose("RUST2021", learner);
    em.flush(); em.clear();
    mvc.perform(auth(get(path()), learner)).andExpect(status().isOk())
        .andExpect(jsonPath("selectedLanguage").value("RUST2021"));
    mvc.perform(auth(get(path()), other)).andExpect(status().isOk())
        .andExpect(jsonPath("selectedLanguage").value("JAVA21"));
    mvc.perform(auth(get("/api/users/me/learning-courses"), learner)).andExpect(status().isOk())
        .andExpect(jsonPath("$[0].selectedLanguage").value("RUST2021"));
    assertThat(em.createQuery("select count(m) from UserCourse m where m.courseId = :id", Long.class)
        .setParameter("id", course.getId()).getSingleResult()).isEqualTo(2L);
  }

  @ParameterizedTest
  @ValueSource(strings = {"CPP23", "JAVA21", "PYTHON311", "JAVASCRIPT_ES2022", "TYPESCRIPT5", "CSHARP_12", "C17", "GO120", "PHP81", "RUST2021"})
  void allTenLanguagesSaveDemonstrationsWithoutRunningOrAwardingProgress(String language) throws Exception {
    choose(language, learner);
    mvc.perform(auth(post("/api/tasks/{id}/submissions", task.getId()), learner)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"language\":\"" + language + "\",\"sourceCode\":\"demo code\"}"))
        .andExpect(status().isAccepted()).andExpect(jsonPath("status").value("DEMO"));
    em.flush();
    Submission saved = submissions.findAll().stream().filter(s -> s.getTask().getId().equals(task.getId())).findFirst().orElseThrow();
    assertThat(saved.getStatus()).isEqualTo(SubmissionStatus.DEMO);
    assertThat(saved.isCountsForProgress()).isFalse();
    assertThat(saved.getVerdict()).isNull();
    assertThat(saved.getLanguage()).isEqualTo(language);
    assertThat(submissions.findAcceptedTaskIdsByUserId(learner.getId())).isEmpty();
    mvc.perform(auth(get("/api/submissions/{id}", saved.getId()), learner)).andExpect(status().isOk())
        .andExpect(jsonPath("status").value("DEMO"));
    verifyNoInteractions(queue);
  }

  @Test
  void paidCourseRequiresPurchaseAndUnpublishedCourseIsUnavailable() throws Exception {
    course.setPrice(BigDecimal.TEN);
    em.flush();
    mvc.perform(auth(put(path()), learner).contentType(MediaType.APPLICATION_JSON)
        .content("{\"selectedLanguage\":\"CPP23\"}")).andExpect(status().isForbidden());
    assertThat(em.find(UserCourse.class, new UserCourseId(learner.getId(), course.getId()))).isNull();
    course.getStudents().add(learner);
    em.flush();
    choose("CPP23", learner);
    course.setPublished(false);
    em.flush();
    mvc.perform(auth(get(path()), learner)).andExpect(status().isNotFound());
  }

  @Test
  void rejectsMissingChoiceUnsupportedLanguageAndMismatchedSubmission() throws Exception {
    mvc.perform(get(path())).andExpect(status().isForbidden());
    mvc.perform(auth(put(path()), learner).contentType(MediaType.APPLICATION_JSON)
        .content("{\"selectedLanguage\":\"UNKNOWN\"}")).andExpect(status().isBadRequest());
    mvc.perform(auth(put(path()), learner).contentType(MediaType.APPLICATION_JSON)
        .content("{}")).andExpect(status().isBadRequest());
    mvc.perform(auth(post("/api/tasks/{id}/submissions", task.getId()), learner)
        .contentType(MediaType.APPLICATION_JSON).content("{\"language\":\"CPP23\",\"sourceCode\":\"demo\"}"))
        .andExpect(status().isBadRequest());
    choose("PYTHON311", learner);
    mvc.perform(auth(post("/api/tasks/{id}/submissions", task.getId()), learner)
        .contentType(MediaType.APPLICATION_JSON).content("{\"language\":\"CPP23\",\"sourceCode\":\"demo\"}"))
        .andExpect(status().isBadRequest());
    verifyNoInteractions(queue);
  }

  @Test
  void fixedLanguageCourseDoesNotAcceptUserLanguageChanges() throws Exception {
    course.setMultilingual(false);
    course.setAvailableLanguages(new HashSet<>(Set.of("JAVA21")));
    em.flush();
    mvc.perform(auth(get(path()), learner)).andExpect(status().isOk())
        .andExpect(jsonPath("selectedLanguage").value("JAVA21"))
        .andExpect(jsonPath("multilingual").value(false));
    mvc.perform(auth(put(path()), learner).contentType(MediaType.APPLICATION_JSON)
        .content("{\"selectedLanguage\":\"JAVA21\"}")).andExpect(status().isBadRequest());
  }

  @Test
  void theoryFollowsSavedLanguageAndDoesNotLeakOtherVariants() throws Exception {
    Lesson lesson = task.getLesson();
    lesson.setContentMd("Base text");
    lesson.setContentByLanguage(new java.util.HashMap<>(Map.of("PYTHON311", "Python text", "JAVA21", "Java text")));
    em.flush();
    choose("PYTHON311", learner);
    choose("JAVA21", other);
    em.flush(); em.clear();
    mvc.perform(auth(get("/api/lessons/{id}/theory", lesson.getId()), learner))
        .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "private, no-store"))
        .andExpect(jsonPath("contentMd").value("Python text"))
        .andExpect(jsonPath("language").value("PYTHON311"))
        .andExpect(jsonPath("fallback").value(false))
        .andExpect(jsonPath("contentByLanguage").doesNotExist());
    mvc.perform(auth(get("/api/lessons/{id}/learn", lesson.getId()), other))
        .andExpect(status().isOk()).andExpect(jsonPath("lesson.contentMd").value("Java text"))
        .andExpect(jsonPath("lesson.contentByLanguage").doesNotExist());
    choose("JAVA21", learner);
    mvc.perform(auth(get("/api/lessons/{id}/theory", lesson.getId()), learner))
        .andExpect(status().isOk()).andExpect(jsonPath("contentMd").value("Java text"));
    mvc.perform(get("/api/lessons/{id}", lesson.getId())).andExpect(status().isOk())
        .andExpect(jsonPath("contentMd").doesNotExist()).andExpect(jsonPath("contentByLanguage").doesNotExist());
  }

  @Test
  void missingVersionIsExplicitFallbackAndFixedCourseUsesBase() throws Exception {
    Lesson lesson = task.getLesson();
    lesson.setContentMd("Base text");
    choose("RUST2021", learner);
    mvc.perform(auth(get("/api/lessons/{id}/theory", lesson.getId()), learner))
        .andExpect(status().isOk()).andExpect(jsonPath("contentMd").value("Base text"))
        .andExpect(jsonPath("language").doesNotExist()).andExpect(jsonPath("fallback").value(true));
    course.setMultilingual(false);
    mvc.perform(auth(get("/api/lessons/{id}/theory", lesson.getId()), learner))
        .andExpect(status().isOk()).andExpect(jsonPath("contentMd").value("Base text"))
        .andExpect(jsonPath("fallback").value(false));
  }

  @Test
  void theoryRequiresAuthenticationPurchaseAndPublishedContent() throws Exception {
    long id = task.getLesson().getId();
    mvc.perform(get("/api/lessons/{id}/theory", id)).andExpect(status().isForbidden());
    course.setPrice(BigDecimal.TEN);
    em.flush();
    mvc.perform(auth(get("/api/lessons/{id}/theory", id), learner)).andExpect(status().isForbidden());
    course.setPrice(BigDecimal.ZERO);
    task.getLesson().setPublished(false);
    em.flush();
    mvc.perform(auth(get("/api/lessons/{id}/theory", id), learner)).andExpect(status().isForbidden());
    task.getLesson().setPublished(true);
    course.setPublished(false);
    em.flush();
    mvc.perform(auth(get("/api/lessons/{id}/theory", id), learner)).andExpect(status().isForbidden());
  }

  private String path() { return "/api/courses/" + course.getId() + "/language"; }
  private MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder request, User learner) {
    return request.with(user(UserDetailsImpl.build(learner)));
  }
  private void choose(String language, User learner) throws Exception {
    mvc.perform(auth(put(path()), learner).contentType(MediaType.APPLICATION_JSON)
        .content("{\"selectedLanguage\":\"" + language + "\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("selectedLanguage").value(language));
  }
  private User learner(String name) {
    User learner = new User();
    learner.setUsername(name);
    learner.setEmail(name + "@example.test");
    learner.setPassword("test-only");
    learner.setRole(Role.ROLE_USER);
    learner.setRegistrationDate(LocalDateTime.now());
    em.persist(learner);
    return learner;
  }
}
