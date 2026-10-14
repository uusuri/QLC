package com.qlc.services;

import com.qlc.models.entities.*;
import com.qlc.models.enums.Role;
import com.qlc.models.enums.SubmissionStatus;
import com.qlc.models.enums.Verdict;
import com.qlc.repositories.SubmissionRepository;
import com.qlc.security.UserDetailsImpl;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
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
class InstantAnswerIntegrationTest {
  @Autowired EntityManager em;
  @Autowired WebApplicationContext context;
  @Autowired SubmissionRepository submissions;
  @Autowired LearningProgressService progress;
  @MockitoBean RedisQueueService queue;
  MockMvc mvc;
  User learner;
  User other;
  Course course;
  Lesson lesson;
  NumericTask numeric;
  TestTask test;
  CodeTask code;

  @BeforeEach
  void setup() {
    mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    learner = learner("answers-learner");
    other = learner("answers-other");
    course = new Course();
    course.setName("Instant answers");
    course.setDescription("Test");
    course.setPrice(BigDecimal.ZERO);
    course.setPriceInStars(BigDecimal.ZERO);
    em.persist(course);
    com.qlc.models.entities.Module module = new com.qlc.models.entities.Module();
    module.setCourse(course);
    module.setName("Test");
    module.setDescription("Test");
    em.persist(module);
    lesson = new Lesson();
    lesson.setModule(module);
    lesson.setName("Test");
    lesson.setDescription("Test");
    lesson.setContentMd("Theory");
    em.persist(lesson);
    numeric = new NumericTask();
    numeric.setCorrectNumericAnswer(new BigDecimal("-12.5000"));
    saveTask(numeric);
    test = new TestTask();
    test.setOptions(List.of("Alpha", "Beta", "Gamma"));
    test.setCorrectOptionIndexes(List.of(0, 2));
    saveTask(test);
    code = new CodeTask();
    code.setTestCases("[]");
    saveTask(code);
    em.flush();
  }

  @ParameterizedTest
  @ValueSource(strings = {"-12.5", "-12.5000", "-012.50000"})
  void numericUsesExactDecimalComparisonAndPersistsFinishedAnswer(String answer) throws Exception {
    mvc.perform(answer(numeric, "{\"numericAnswer\":\"" + answer + "\"}"))
        .andExpect(status().isCreated()).andExpect(jsonPath("status").value("FINISHED"))
        .andExpect(jsonPath("verdict").value("AC")).andExpect(jsonPath("language").doesNotExist());
    em.flush();
    Submission saved = submissions.findAll().getLast();
    assertThat(saved.getSubmittedAnswer()).isEqualTo(new BigDecimal(answer).toPlainString());
    assertThat(saved.getSourceCode()).isNull();
    assertThat(saved.getLanguage()).isNull();
    assertThat(saved.getUser().getId()).isEqualTo(learner.getId());
    assertThat(saved.getVerdict()).isEqualTo(Verdict.AC);
    verifyNoInteractions(queue);
  }

  @Test
  void precisionBeyondDoubleAndWrongAnswers() throws Exception {
    numeric.setCorrectNumericAnswer(new BigDecimal("900719925474099.1234"));
    mvc.perform(answer(numeric, "{\"numericAnswer\":\"900719925474099.1234\"}"))
        .andExpect(status().isCreated()).andExpect(jsonPath("verdict").value("AC"));
    mvc.perform(answer(numeric, "{\"numericAnswer\":\"900719925474099.1235\"}"))
        .andExpect(status().isCreated()).andExpect(jsonPath("verdict").value("WA"));
    verifyNoInteractions(queue);
  }

  @ParameterizedTest
  @ValueSource(strings = {"{}", "{\"numericAnswer\":12.5}", "{\"numericAnswer\":\"NaN\"}",
      "{\"numericAnswer\":\"\"}", "{\"numericAnswer\":\"12,5\"}", "{\"numericAnswer\":\"1e10000000\"}",
      "{\"numericAnswer\":\"-12.5\",\"selectedOptionIndexes\":[0]}"})
  void rejectsMalformedNumericPayloadWithoutSaving(String payload) throws Exception {
    long before = submissions.count();
    mvc.perform(answer(numeric, payload)).andExpect(status().isBadRequest());
    assertThat(submissions.count()).isEqualTo(before);
    verifyNoInteractions(queue);
  }

  @Test
  void testRequiresExactSetAndIgnoresOrderAndDuplicates() throws Exception {
    for (String indexes : List.of("[2,0]", "[0,2,0]")) {
      mvc.perform(answer(test, "{\"selectedOptionIndexes\":" + indexes + "}"))
          .andExpect(status().isCreated()).andExpect(jsonPath("verdict").value("AC"));
    }
    for (String indexes : List.of("[0]", "[0,1,2]", "[1]")) {
      mvc.perform(answer(test, "{\"selectedOptionIndexes\":" + indexes + "}"))
          .andExpect(status().isCreated()).andExpect(jsonPath("verdict").value("WA"));
    }
    assertThat(submissions.findAll()).filteredOn(s -> s.getVerdict() == Verdict.AC)
        .extracting(Submission::getSubmittedAnswer).containsOnly("[0,2]");
    verifyNoInteractions(queue);
  }

  @ParameterizedTest
  @ValueSource(strings = {"{}", "{\"selectedOptionIndexes\":[]}", "{\"selectedOptionIndexes\":[-1]}",
      "{\"selectedOptionIndexes\":[3]}", "{\"selectedOptionIndexes\":[null]}",
      "{\"selectedOptionIndexes\":[0.5]}", "{\"selectedOptionIndexes\":[\"0\"]}",
      "{\"selectedOptionIndexes\":[0],\"numericAnswer\":\"1\"}"})
  void invalidTestPayloadDoesNotCreateAttempt(String payload) throws Exception {
    long before = submissions.count();
    mvc.perform(answer(test, payload)).andExpect(status().isBadRequest());
    assertThat(submissions.count()).isEqualTo(before);
  }

  @Test
  void singleAnswerRejectsMultipleSelections() throws Exception {
    test.setCorrectOptionIndexes(List.of(1));
    mvc.perform(answer(test, "{\"selectedOptionIndexes\":[1]}"))
        .andExpect(status().isCreated()).andExpect(jsonPath("verdict").value("AC"));
    mvc.perform(answer(test, "{\"selectedOptionIndexes\":[0,1]}"))
        .andExpect(status().isBadRequest());
    mvc.perform(get("/api/lessons/{id}/learn", lesson.getId()).with(user(UserDetailsImpl.build(learner))))
        .andExpect(jsonPath("tasks[?(@.taskType == 'TEST')].multipleAnswersAllowed").value(org.hamcrest.Matchers.contains(false)));
  }

  @Test
  void learnerDtoHidesAnswersAndKeepsOptionOrderAcrossPersistence() throws Exception {
    em.clear();
    mvc.perform(get("/api/lessons/{id}/learn", lesson.getId()).with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("tasks[?(@.taskType == 'TEST')].multipleAnswersAllowed").value(org.hamcrest.Matchers.contains(true)))
        .andExpect(jsonPath("tasks[*].correctOptionIndexes").isEmpty())
        .andExpect(jsonPath("tasks[*].correctNumericAnswer").isEmpty());
    assertThat(em.find(TestTask.class, test.getId()).getOptions()).containsExactly("Alpha", "Beta", "Gamma");
  }

  @Test
  void allSubmissionTypesEnforceActualCoursePurchaseAndPublication() throws Exception {
    course.setPriceInStars(BigDecimal.TEN);
    assertAllDenied();
    course.getStudents().add(learner);
    em.flush();
    mvc.perform(answer(numeric, "{\"numericAnswer\":\"-12.5\"}"))
        .andExpect(status().isCreated());
    mvc.perform(answer(test, "{\"selectedOptionIndexes\":[0,2]}"))
        .andExpect(status().isCreated());
    mvc.perform(code()).andExpect(status().isAccepted());
    lesson.setPublished(false);
    assertAllDenied();
    lesson.setPublished(true);
    course.setPublished(false);
    assertAllDenied();
    verifyNoInteractions(queue); // The enclosing test transaction never commits.
  }

  @Test
  void freeCourseSupportsCodeAndBothInstantTypes() throws Exception {
    mvc.perform(code()).andExpect(status().isAccepted()).andExpect(jsonPath("status").value("QUEUED"));
    mvc.perform(answer(numeric, "{\"numericAnswer\":\"0\"}"))
        .andExpect(status().isCreated()).andExpect(jsonPath("verdict").value("WA"));
    mvc.perform(answer(test, "{\"selectedOptionIndexes\":[0,2]}"))
        .andExpect(status().isCreated()).andExpect(jsonPath("verdict").value("AC"));
    assertThat(submissions.findAll()).filteredOn(s -> s.getTask().getId().equals(code.getId()))
        .allSatisfy(s -> assertThat(s.getStatus()).isEqualTo(SubmissionStatus.QUEUED));
  }

  @Test
  void acceptedAnswersCountOnceAndAreReturnedOnLessonReload() throws Exception {
    course.getStudents().add(learner);
    em.flush();
    mvc.perform(answer(numeric, "{\"numericAnswer\":\"-12.5\"}")).andExpect(status().isCreated());
    mvc.perform(answer(numeric, "{\"numericAnswer\":\"-12.5\"}")).andExpect(status().isCreated());
    mvc.perform(answer(test, "{\"selectedOptionIndexes\":[2,0]}" )).andExpect(status().isCreated());
    mvc.perform(answer(test, "{\"selectedOptionIndexes\":[1]}" )).andExpect(status().isCreated());
    em.flush();
    em.clear();
    var snapshot = progress.getPurchasedCoursesProgress(learner.getId()).getFirst();
    assertThat(snapshot.solvedTasks()).isEqualTo(2);
    assertThat(snapshot.totalTasks()).isEqualTo(3);
    assertThat(snapshot.progressPercent()).isEqualTo(66);
    mvc.perform(get("/api/lessons/{id}/learn", lesson.getId()).with(user(UserDetailsImpl.build(learner))))
        .andExpect(jsonPath("acceptedTaskIds").value(org.hamcrest.Matchers.containsInAnyOrder(numeric.getId().intValue(), test.getId().intValue())));
  }

  @Test
  void requiresAuthenticationAndDoesNotExposeOtherUsersAttempts() throws Exception {
    mvc.perform(post("/api/tasks/{id}/answers", numeric.getId()).contentType(MediaType.APPLICATION_JSON)
        .content("{\"numericAnswer\":\"0\"}")).andExpect(status().isUnauthorized());
    mvc.perform(answer(numeric, "{\"numericAnswer\":\"0\"}")).andExpect(status().isCreated());
    UUID id = submissions.findAll().getLast().getId();
    mvc.perform(get("/api/submissions/{id}", id).with(user(UserDetailsImpl.build(other))))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/submissions/{id}", id).with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isOk()).andExpect(jsonPath("verdict").value("WA"));
    mvc.perform(post("/api/tasks/99999999/answers").with(user(UserDetailsImpl.build(learner)))
        .contentType(MediaType.APPLICATION_JSON).content("{\"numericAnswer\":\"0\"}"))
        .andExpect(status().isNotFound());
    mvc.perform(answer(code, "{\"numericAnswer\":\"0\"}")).andExpect(status().isBadRequest());
  }

  void assertAllDenied() throws Exception {
    long before = submissions.count();
    mvc.perform(answer(numeric, "{\"numericAnswer\":\"-12.5\"}" )).andExpect(status().isForbidden());
    mvc.perform(answer(test, "{\"selectedOptionIndexes\":[0,2]}" )).andExpect(status().isForbidden());
    mvc.perform(code()).andExpect(status().isForbidden());
    assertThat(submissions.count()).isEqualTo(before);
  }

  MockHttpServletRequestBuilder answer(Task task, String json) {
    return post("/api/tasks/{id}/answers", task.getId()).with(user(UserDetailsImpl.build(learner)))
        .contentType(MediaType.APPLICATION_JSON).content(json);
  }

  MockHttpServletRequestBuilder code() {
    return post("/api/tasks/{id}/submissions", code.getId()).with(user(UserDetailsImpl.build(learner)))
        .contentType(MediaType.APPLICATION_JSON).content("{\"language\":\"CPP23\",\"sourceCode\":\"int main() {}\"}");
  }

  void saveTask(Task task) {
    task.setLesson(lesson);
    task.setStatementMd("Answer the question");
    em.persist(task);
  }

  User learner(String name) {
    User user = new User();
    user.setUsername(name);
    user.setEmail(name + "@example.test");
    user.setPassword("unused");
    user.setRole(Role.ROLE_USER);
    user.setRegistrationDate(LocalDateTime.now());
    em.persist(user);
    return user;
  }
}
