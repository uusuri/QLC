package com.qlc.services;

import com.qlc.models.dtos.LessonProgressDTO;
import com.qlc.models.dtos.ModuleProgressDTO;
import com.qlc.models.dtos.MyCourseProgressDTO;
import com.qlc.models.entities.Course;
import com.qlc.models.entities.Lesson;
import com.qlc.models.entities.Task;
import com.qlc.repositories.CourseRepository;
import com.qlc.repositories.SubmissionRepository;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Собирает учебную карту только из реально купленных пользователем курсов. */
@Service
@Transactional(readOnly = true)
public class LearningProgressService {

  private final CourseRepository courseRepository;
  private final SubmissionRepository submissionRepository;

  public LearningProgressService(CourseRepository courseRepository,
      SubmissionRepository submissionRepository) {
    this.courseRepository = courseRepository;
    this.submissionRepository = submissionRepository;
  }

  public List<MyCourseProgressDTO> getPurchasedCoursesProgress(Long userId) {
    Set<Long> acceptedTaskIds = submissionRepository.findAcceptedTaskIdsByUserId(userId);

    return courseRepository.findPurchasedByUserId(userId).stream()
        .map(course -> mapCourse(course, acceptedTaskIds))
        .toList();
  }

  private MyCourseProgressDTO mapCourse(Course course, Set<Long> acceptedTaskIds) {
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

    return new MyCourseProgressDTO(course.getId(), course.getName(), course.getDescription(),
        solvedTasks, totalTasks, toPercent(solvedTasks, totalTasks), modules);
  }

  private LessonProgressDTO mapLesson(Lesson lesson, Set<Long> acceptedTaskIds) {
    List<Task> tasks = lesson.getTasks();
    int totalTasks = tasks.size();
    int solvedTasks = (int) tasks.stream().map(Task::getId).filter(acceptedTaskIds::contains).count();

    return new LessonProgressDTO(lesson.getId(), lesson.getName(), lesson.getDescription(),
        lesson.getPosition(), solvedTasks, totalTasks, toPercent(solvedTasks, totalTasks));
  }

  private int toPercent(int solvedTasks, int totalTasks) {
    return totalTasks == 0 ? 0 : Math.round((solvedTasks * 100f) / totalTasks);
  }
}
