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

  // ==== COURSES ====
  @GetMapping("/courses")
  public ResponseEntity<List<CourseDTO>> getAllCourses() {
    return ResponseEntity.ok()
        .header("Cache-Control", "max-age=60")
        .body(courseService.getAllCourses());
  }

  @GetMapping("/courses/{id}")
  public ResponseEntity<CourseDTO> getCourseById(@PathVariable Long id) {
    return ResponseEntity.ok()
        .header("Cache-Control", "max-age=60")
        .body(courseService.getCourseById(id));
  }

  @PostMapping("/courses")
  public ResponseEntity<CourseDTO> createCourse(@RequestBody CourseDTO courseDTO) {
    return ResponseEntity.ok(courseService.createCourse(courseDTO));
  }

  @PutMapping("/courses/{id}")
  public ResponseEntity<CourseDTO> updateCourse(@PathVariable Long id, @RequestBody CourseDTO courseDTO) {
    return ResponseEntity.ok(courseService.updateCourse(id, courseDTO));
  }

  @DeleteMapping("/courses/{id}")
  public ResponseEntity<Void> deleteCourse(@PathVariable Long id) {
    courseService.deleteCourse(id);
    return ResponseEntity.noContent().build();
  }

  // ==== MODULES ====
  @GetMapping("/courses/{courseId}/modules")
  public ResponseEntity<List<ModuleDTO>> getModulesByCourseId(@PathVariable Long courseId) {
    return ResponseEntity.ok()
        .header("Cache-Control", "max-age=60")
        .body(courseService.getModulesByCourseId(courseId));
  }

  @GetMapping("/modules/{id}")
  public ResponseEntity<ModuleDTO> getModuleById(@PathVariable Long id) {
    return ResponseEntity.ok()
        .header("Cache-Control", "max-age=60")
        .body(courseService.getModuleById(id));
  }

  @PostMapping("/courses/{courseId}/modules")
  public ResponseEntity<ModuleDTO> createModule(@PathVariable Long courseId, @RequestBody ModuleDTO moduleDTO) {
    return ResponseEntity.ok(courseService.createModule(courseId, moduleDTO));
  }

  @PutMapping("/modules/{id}")
  public ResponseEntity<ModuleDTO> updateModule(@PathVariable Long id, @RequestBody ModuleDTO moduleDTO) {
    return ResponseEntity.ok(courseService.updateModule(id, moduleDTO));
  }

  @DeleteMapping("/modules/{id}")
  public ResponseEntity<Void> deleteModule(@PathVariable Long id) {
    courseService.deleteModule(id);
    return ResponseEntity.noContent().build();
  }

  // ==== LESSONS ====
  @GetMapping("/modules/{moduleId}/lessons")
  public ResponseEntity<List<LessonDTO>> getLessonsByModuleId(@PathVariable Long moduleId) {
    return ResponseEntity.ok()
        .header("Cache-Control", "max-age=60")
        .body(courseService.getLessonsByModuleId(moduleId));
  }

  @GetMapping("/lessons/{id}")
  public ResponseEntity<LessonDTO> getLessonById(@PathVariable Long id) {
    return ResponseEntity.ok()
        .header("Cache-Control", "max-age=60")
        .body(courseService.getLessonById(id));
  }

  @PostMapping("/modules/{moduleId}/lessons")
  public ResponseEntity<LessonDTO> createLesson(@PathVariable Long moduleId, @RequestBody LessonDTO lessonDTO) {
    return ResponseEntity.ok(courseService.createLesson(moduleId, lessonDTO));
  }

  @PutMapping("/lessons/{id}")
  public ResponseEntity<LessonDTO> updateLesson(@PathVariable Long id, @RequestBody LessonDTO lessonDTO) {
    return ResponseEntity.ok(courseService.updateLesson(id, lessonDTO));
  }

  @DeleteMapping("/lessons/{id}")
  public ResponseEntity<Void> deleteLesson(@PathVariable Long id) {
    courseService.deleteLesson(id);
    return ResponseEntity.noContent().build();
  }

  // ==== TASKS ====
  @GetMapping("/lessons/{lessonId}/tasks")
  public ResponseEntity<List<TaskDTO>> getTasksByLessonId(@PathVariable Long lessonId) {
    return ResponseEntity.ok(courseService.getTasksByLessonId(lessonId));
  }

  @GetMapping("/tasks/{id}")
  public ResponseEntity<TaskDTO> getTaskById(@PathVariable Long id) {
    return ResponseEntity.ok(courseService.getTaskById(id));
  }

  @PostMapping("/lessons/{lessonId}/tasks")
  public ResponseEntity<TaskDTO> createTask(@PathVariable Long lessonId, @RequestBody TaskDTO taskDTO) {
    return ResponseEntity.ok(courseService.createTask(lessonId, taskDTO));
  }

  @PutMapping("/tasks/{id}")
  public ResponseEntity<TaskDTO> updateTask(@PathVariable Long id, @RequestBody TaskDTO taskDTO) {
    return ResponseEntity.ok(courseService.updateTask(id, taskDTO));
  }

  @DeleteMapping("/tasks/{id}")
  public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
    courseService.deleteTask(id);
    return ResponseEntity.noContent().build();
  }
}
