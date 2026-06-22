package com.qlc.services;

import com.qlc.models.entities.Task;

import com.qlc.models.dtos.CourseDTO;
import com.qlc.models.dtos.LessonDTO;
import com.qlc.models.dtos.ModuleDTO;
import com.qlc.models.dtos.TaskDTO;

import com.qlc.repositories.CourseRepository;
import com.qlc.repositories.LessonRepository;
import com.qlc.repositories.ModuleRepository;
import com.qlc.repositories.TaskRepository;

import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Transactional
public class CourseService {

  private final CourseRepository courseRepository;
  private final ModuleRepository moduleRepository;
  private final LessonRepository lessonRepository;
  private final TaskRepository taskRepository;

  public CourseService(CourseRepository courseRepository, ModuleRepository moduleRepository,
      LessonRepository lessonRepository, TaskRepository taskRepository) {
    this.courseRepository = courseRepository;
    this.moduleRepository = moduleRepository;
    this.lessonRepository = lessonRepository;
    this.taskRepository = taskRepository;
  }

  public List<CourseDTO> getAllCourses() {
    return courseRepository.findAll().stream()
        .map(c -> new CourseDTO(c.getId(), c.getName(), c.getDescription(), c.getPrice(), c.getPriceInStars()))
        .toList();
  }

  public List<ModuleDTO> getModulesByCourseId(Long courseId) {
    return moduleRepository.findByCourseId(courseId).stream()
        .map(m -> new ModuleDTO(m.getId(), m.getCourse().getId(), m.getName(), m.getDescription()))
        .toList();
  }

  public List<LessonDTO> getLessonsByModuleId(Long moduleId) {
    return lessonRepository.findByModuleId(moduleId).stream()
        .map(l -> new LessonDTO(l.getId(), l.getModule().getId(), l.getName(), l.getDescription()))
        .toList();
  }

  public List<TaskDTO> getTasksByLessonId(Long lessonId) {
    return taskRepository.findByLessonId(lessonId).stream()
        .map(t -> {
          // Безопасно вытаскиваем templateCode, так как в Task его нет
          String templateCode = null;
          if (t instanceof com.qlc.models.entities.CodeTask) {
            templateCode = ((com.qlc.models.entities.CodeTask) t).getTemplateCode();
          }

          return new TaskDTO(
              t.getId(),
              t.getLesson().getId(),
              t.getTaskType(), // Теперь метод работает благодаря @Transient в Task
              t.getTaskText(),
              templateCode);
        })
        .toList();
  }

  public TaskDTO getTaskById(Long taskId) {
    Task t = taskRepository.findById(taskId)
        .orElseThrow(() -> new RuntimeException("Task not found with id: " + taskId));

    String templateCode = null;
    if (t instanceof com.qlc.models.entities.CodeTask) {
      templateCode = ((com.qlc.models.entities.CodeTask) t).getTemplateCode();
    }

    return new TaskDTO(
        t.getId(),
        t.getLesson().getId(),
        t.getTaskType(),
        t.getTaskText(),
        templateCode);
  }
}
