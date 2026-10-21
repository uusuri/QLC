package com.qlc.api.services;

import com.qlc.api.models.dtos.LessonProgressDTO;
import com.qlc.api.models.dtos.ModuleProgressDTO;
import com.qlc.api.models.dtos.MyCourseProgressDTO;
import com.qlc.shared.model.entities.Course;
import com.qlc.shared.model.entities.Lesson;
import com.qlc.shared.model.entities.Task;
import com.qlc.api.repositories.CourseRepository;
import com.qlc.shared.repositories.SubmissionRepository;
import com.qlc.api.repositories.TaskRepository;
import com.qlc.api.repositories.UserRepository;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Собирает учебную карту только из реально купленных пользователем курсов. */
@Service
@Transactional(readOnly = true)
public class LearningProgressService {

  private final CourseRepository courseRepository;
  private final SubmissionRepository submissionRepository;

  private final UserRepository userRepository;
  private final TaskRepository taskRepository;
  private final CourseService courseService;
  private final com.qlc.api.repositories.UserCourseRepository memberships;

  public LearningProgressService(CourseRepository courseRepository,
      SubmissionRepository submissionRepository, UserRepository userRepository,
      TaskRepository taskRepository, CourseService courseService, com.qlc.api.repositories.UserCourseRepository memberships) {
    this.courseRepository = courseRepository;
    this.submissionRepository = submissionRepository;
    this.userRepository = userRepository;
    this.taskRepository = taskRepository;
    this.courseService = courseService;
    this.memberships = memberships;
  }

  public List<MyCourseProgressDTO> getPurchasedCoursesProgress(Long userId) {
    Set<Long> acceptedTaskIds = submissionRepository.findAcceptedTaskIdsByUserId(userId);
    Task lastTask = userRepository.findLastLearningTask(userId).orElse(null);

    var selectedLanguages = new java.util.HashMap<Long, String>();
    memberships.findByUserId(userId).forEach(m -> selectedLanguages.put(m.getCourseId(), m.getSelectedLanguage()));
    return courseRepository.findPurchasedByUserId(userId).stream()
        .map(course -> mapCourse(course, acceptedTaskIds, lastTask, selectedLanguages.get(course.getId())))
        .toList();
  }

  @Transactional
  public void rememberTask(Long userId, Long taskId) {
    Task task = taskRepository.findById(taskId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
    Course course = task.getLesson().getModule().getCourse();
    if (!course.isPublished() || !task.getLesson().isPublished()
        || !courseService.hasUserAccessToCourse(course.getId(), userId)) {
      throw new AccessDeniedException("Task is not available for learning");
    }
    userRepository.updateLastLearningTask(userId, task);
  }

  private MyCourseProgressDTO mapCourse(Course course, Set<Long> acceptedTaskIds, Task lastTask, String selectedLanguage) {
    List<ModuleProgressDTO> modules = course.getModules().stream()
        .map(module -> new ModuleProgressDTO(
            module.getId(), module.getName(), module.getDescription(), module.getPosition(),
            module.getLessons().stream()
                .filter(Lesson::isPublished)
                .map(lesson -> mapLesson(lesson, acceptedTaskIds))
                .toList()))
        .toList();

    int totalTasks = modules.stream().flatMap(module -> module.lessons().stream())
        .mapToInt(LessonProgressDTO::totalTasks).sum();
    int solvedTasks = modules.stream().flatMap(module -> module.lessons().stream())
        .mapToInt(LessonProgressDTO::solvedTasks).sum();

    boolean canResume = lastTask != null && course.isPublished()
        && lastTask.getLesson().isPublished()
        && lastTask.getLesson().getModule().getCourse().getId() == course.getId();
    return new MyCourseProgressDTO(course.getId(), course.getName(), course.getDescription(),
        solvedTasks, totalTasks, toPercent(solvedTasks, totalTasks),
        canResume ? lastTask.getLesson().getId() : null,
        canResume ? lastTask.getId() : null, modules, course.isMultilingual(),
        course.isMultilingual() && course.getAvailableLanguages().contains(selectedLanguage) ? selectedLanguage : null);
  }

  private LessonProgressDTO mapLesson(Lesson lesson, Set<Long> acceptedTaskIds) {
    List<Task> tasks = lesson.getTasks();
    int totalTasks = tasks.size();
    int solvedTasks = (int) tasks.stream().map(Task::getId).filter(acceptedTaskIds::contains).count();

    return new LessonProgressDTO(lesson.getId(), lesson.getName(), lesson.getDescription(),
        lesson.getPosition(), solvedTasks, totalTasks, toPercent(solvedTasks, totalTasks));
  }

  private int toPercent(int solvedTasks, int totalTasks) {
    return totalTasks == 0 ? 0 : (int) ((solvedTasks * 100L) / totalTasks);
  }
}
