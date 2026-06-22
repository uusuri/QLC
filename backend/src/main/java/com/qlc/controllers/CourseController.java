package com.qlc.controllers;

import com.qlc.models.dtos.*;
import com.qlc.services.CourseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class CourseController {

  private final CourseService courseService;

  public CourseController(CourseService courseService) {
    this.courseService = courseService;
  }

  // 1. Получить все курсы (возвращаем список DTO)
  @GetMapping("/courses")
  public ResponseEntity<List<CourseDTO>> getAllCourses() {
    return ResponseEntity.ok(courseService.getAllCourses());
  }

  // 2. Получить все модули конкретного курса (Вложенный путь)
  // URL: /api/courses/1/modules
  @GetMapping("/courses/{courseId}/modules")
  public ResponseEntity<List<ModuleDTO>> getModulesByCourseId(@PathVariable Long courseId) {
    return ResponseEntity.ok(courseService.getModulesByCourseId(courseId));
  }

  // 3. Получить все уроки конкретного модуля
  // URL: /api/modules/1/lessons
  @GetMapping("/modules/{moduleId}/lessons")
  public ResponseEntity<List<LessonDTO>> getLessonsByModuleId(@PathVariable Long moduleId) {
    return ResponseEntity.ok(courseService.getLessonsByModuleId(moduleId));
  }

  // 4. Получить все таски конкретного урока
  // URL: /api/lessons/1/tasks
  @GetMapping("/lessons/{lessonId}/tasks")
  public ResponseEntity<List<TaskDTO>> getTasksByLessonId(@PathVariable Long lessonId) {
    return ResponseEntity.ok(courseService.getTasksByLessonId(lessonId));
  }

  // 5. Получить одну конкретную таску напрямую (для страницы выполнения задачи)
  // URL: /api/tasks/123
  @GetMapping("/tasks/{taskId}")
  public ResponseEntity<TaskDTO> getTaskById(@PathVariable Long taskId) {
    return ResponseEntity.ok(courseService.getTaskById(taskId));
  }
}
