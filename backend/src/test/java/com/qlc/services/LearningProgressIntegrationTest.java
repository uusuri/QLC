package com.qlc.services;

import com.qlc.models.dtos.MyCourseProgressDTO;
import com.qlc.models.entities.CodeTask;
import com.qlc.models.entities.Course;
import com.qlc.models.entities.Lesson;
import com.qlc.models.entities.Submission;
import com.qlc.models.entities.User;
import com.qlc.models.enums.Role;
import com.qlc.models.enums.SubmissionStatus;
import com.qlc.models.enums.Verdict;
import com.qlc.repositories.UserRepository;
import com.qlc.security.UserDetailsImpl;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"app.submissions.worker.enabled=false", "app.submissions.mock-auto-accept=true"})
@ActiveProfiles("test")
@Transactional
class LearningProgressIntegrationTest {
  @Autowired EntityManager entityManager;
  @Autowired LearningProgressService progress;
  @Autowired UserRepository users;
  @Autowired WebApplicationContext context;

  private User learner;
  private User other;
  private CodeTask first;
  private CodeTask second;
  private long courseId;

  @BeforeEach
  void setup() {
    learner = createUser("progress-learner", 901L);
    other = createUser("progress-other", 902L);
    List<CodeTask> tasks = createCourse("Progress course", learner);
    first = tasks.get(0);
    second = tasks.get(1);
    courseId = first.getLesson().getModule().getCourse().getId();
    entityManager.flush();
    entityManager.clear();
  }

  @Test
  void onlyNewFinishedUniqueAcForCurrentUserAndPublishedLessonsCount() {
    attempt(learner, first, Verdict.AC, SubmissionStatus.FINISHED, false);
    attempt(other, first, Verdict.AC, SubmissionStatus.FINISHED, true);
    attempt(learner, first, Verdict.WA, SubmissionStatus.FINISHED, true);
    attempt(learner, second, Verdict.AC, SubmissionStatus.RUNNING, true);
    assertProgress(0, 0);

    attempt(learner, first, Verdict.AC, SubmissionStatus.FINISHED, true);
    attempt(learner, first, Verdict.AC, SubmissionStatus.FINISHED, true);
    attempt(learner, first, Verdict.WA, SubmissionStatus.FINISHED, true);
    assertProgress(1, 50);

    attempt(learner, second, Verdict.AC, SubmissionStatus.FINISHED, true);
    assertProgress(2, 100);

    entityManager.find(Lesson.class, first.getLesson().getId()).setPublished(false);
    MyCourseProgressDTO hidden = courseProgress();
    assertThat(hidden.totalTasks()).isZero();
    assertThat(hidden.solvedTasks()).isZero();
    assertThat(hidden.progressPercent()).isZero();
  }

  @Test
  void oneRemainingTaskNeverRoundsUpToFullCompletion() {
    Lesson lesson = entityManager.find(Lesson.class, first.getLesson().getId());
    for (int i = 0; i < 198; i++) {
      CodeTask task = new CodeTask();
      task.setLesson(lesson);
      task.setStatementMd("Extra task " + i);
      entityManager.persist(task);
      attempt(learner, task, Verdict.AC, SubmissionStatus.FINISHED, true);
    }
    attempt(learner, first, Verdict.AC, SubmissionStatus.FINISHED, true);
    entityManager.flush();
    entityManager.clear();
    assertThat(courseProgress().totalTasks()).isEqualTo(200);
    assertThat(courseProgress().solvedTasks()).isEqualTo(199);
    assertThat(courseProgress().progressPercent()).isEqualTo(99);
    assertThat(courseProgress().modules().get(0).lessons().get(0).progressPercent()).isEqualTo(99);
  }

  @Test
  void remembersExactTaskInLatestCourseWithoutAwardingProgress() {
    progress.rememberTask(learner.getId(), second.getId());
    entityManager.clear();
    assertThat(courseProgress().lastTaskId()).isEqualTo(second.getId());
    assertThat(courseProgress().lastLessonId()).isEqualTo(second.getLesson().getId());
    assertThat(users.findLastLearningTask(other.getId())).isEmpty();
    assertProgress(0, 0);

    CodeTask latest = createCourse("Latest course", entityManager.find(User.class, learner.getId())).get(1);
    entityManager.flush();
    entityManager.clear();
    progress.rememberTask(learner.getId(), latest.getId());
    entityManager.clear();
    assertThat(courseProgress().lastTaskId()).isNull();
    assertThat(progress.getPurchasedCoursesProgress(learner.getId()))
        .filteredOn(course -> course.lastTaskId() != null)
        .singleElement().satisfies(course -> assertThat(course.lastTaskId()).isEqualTo(latest.getId()));

    entityManager.find(Lesson.class, latest.getLesson().getId()).setPublished(false);
    assertThat(progress.getPurchasedCoursesProgress(learner.getId()))
        .allSatisfy(course -> assertThat(course.lastTaskId()).isNull());
  }

  @Test
  void rejectsUnpurchasedUnpublishedAndMissingTasks() {
    assertThatThrownBy(() -> progress.rememberTask(other.getId(), first.getId()))
        .isInstanceOf(AccessDeniedException.class);
    entityManager.find(Lesson.class, first.getLesson().getId()).setPublished(false);
    assertThatThrownBy(() -> progress.rememberTask(learner.getId(), first.getId()))
        .isInstanceOf(AccessDeniedException.class);
    assertThatThrownBy(() -> progress.rememberTask(learner.getId(), Long.MAX_VALUE))
        .isInstanceOf(ResponseStatusException.class);
    assertThat(users.findLastLearningTask(learner.getId())).isEmpty();
  }

  @Test
  void authenticatedEndpointStoresPositionAndReturnsItInOverview() throws Exception {
    MockMvc mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    mvc.perform(put("/api/users/me/learning-position/tasks/{id}", second.getId())
            .with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.taskId").value(second.getId()));
    entityManager.clear();
    mvc.perform(get("/api/users/me/learning-courses").with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].lastTaskId").value(second.getId()))
        .andExpect(jsonPath("$[0].progressPercent").value(0));
    mvc.perform(put("/api/users/me/learning-position/tasks/{id}", second.getId())
            .with(user(UserDetailsImpl.build(other))))
        .andExpect(status().isForbidden());
    mvc.perform(put("/api/users/me/learning-position/tasks/{id}", second.getId()))
        .andExpect(status().is4xxClientError());
  }

  private MyCourseProgressDTO courseProgress() {
    entityManager.flush();
    return progress.getPurchasedCoursesProgress(learner.getId()).stream()
        .filter(course -> course.id() == courseId).findFirst().orElseThrow();
  }

  private void assertProgress(int solved, int percent) {
    MyCourseProgressDTO course = courseProgress();
    assertThat(course.totalTasks()).isEqualTo(2);
    assertThat(course.solvedTasks()).isEqualTo(solved);
    assertThat(course.progressPercent()).isEqualTo(percent);
    assertThat(course.modules().get(0).lessons().get(0).progressPercent()).isEqualTo(percent);
  }

  private void attempt(User owner, CodeTask task, Verdict verdict, SubmissionStatus status, boolean counts) {
    Submission submission = new Submission();
    submission.setUser(entityManager.getReference(User.class, owner.getId()));
    submission.setTask(entityManager.getReference(CodeTask.class, task.getId()));
    submission.setLanguage("CPP23");
    submission.setSourceCode("int main() {}");
    submission.setStatus(status);
    submission.setVerdict(verdict);
    submission.setCountsForProgress(counts);
    entityManager.persist(submission);
  }

  private User createUser(String name, long tgId) {
    User user = new User();
    user.setUsername(name);
    user.setTgId(tgId);
    user.setEmail(name + "@example.com");
    user.setPassword("unused");
    user.setRole(Role.ROLE_USER);
    user.setRegistrationDate(LocalDateTime.now());
    entityManager.persist(user);
    return user;
  }

  private List<CodeTask> createCourse(String name, User owner) {
    Course course = new Course();
    course.setName(name);
    course.setDescription(name);
    course.setPrice(BigDecimal.TEN);
    course.setPriceInStars(BigDecimal.TEN);
    course.getStudents().add(owner);
    entityManager.persist(course);
    com.qlc.models.entities.Module module = new com.qlc.models.entities.Module();
    module.setName("Module");
    module.setDescription("Module");
    module.setCourse(course);
    entityManager.persist(module);
    Lesson lesson = new Lesson();
    lesson.setName("Lesson");
    lesson.setDescription("Lesson");
    lesson.setModule(module);
    entityManager.persist(lesson);
    CodeTask firstTask = new CodeTask();
    firstTask.setLesson(lesson);
    firstTask.setStatementMd("First task");
    entityManager.persist(firstTask);
    CodeTask secondTask = new CodeTask();
    secondTask.setLesson(lesson);
    secondTask.setStatementMd("Second task");
    entityManager.persist(secondTask);
    return List.of(firstTask, secondTask);
  }
}
