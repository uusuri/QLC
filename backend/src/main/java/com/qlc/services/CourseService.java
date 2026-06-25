package com.qlc.services;

import com.qlc.models.entities.*;

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

import java.math.BigDecimal;
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

  // --- Course CRUD ---
  public List<CourseDTO> getAllCourses() {
    return courseRepository.findAll().stream()
        .map(this::mapToCourseDTO)
        .toList();
  }

  public CourseDTO getCourseById(Long courseId) {
    Course c = courseRepository.findById(courseId)
        .orElseThrow(() -> new RuntimeException("Course not found"));
    return mapToCourseDTO(c);
  }

  public CourseDTO createCourse(CourseDTO dto) {
    Course course = new Course();
    course.setName(dto.name());
    course.setDescription(dto.description());
    course.setPrice(dto.price() != null ? dto.price() : BigDecimal.ZERO);
    course.setPriceInStars(dto.priceInStars() != null ? dto.priceInStars() : BigDecimal.ZERO);
    return mapToCourseDTO(courseRepository.save(course));
  }

  public CourseDTO updateCourse(Long courseId, CourseDTO dto) {
    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> new RuntimeException("Course not found"));
    course.setName(dto.name());
    course.setDescription(dto.description());
    if (dto.price() != null)
      course.setPrice(dto.price());
    if (dto.priceInStars() != null)
      course.setPriceInStars(dto.priceInStars());
    return mapToCourseDTO(courseRepository.save(course));
  }

  public void deleteCourse(Long courseId) {
    courseRepository.deleteById(courseId);
  }

  private CourseDTO mapToCourseDTO(Course c) {
    return new CourseDTO(c.getId(), c.getName(), c.getDescription(), c.getPrice(), c.getPriceInStars());
  }

  // --- Module CRUD ---
  public List<ModuleDTO> getModulesByCourseId(Long courseId) {
    return moduleRepository.findByCourseId(courseId).stream()
        .map(this::mapToModuleDTO)
        .toList();
  }

  public ModuleDTO getModuleById(Long moduleId) {
    return mapToModuleDTO(moduleRepository.findById(moduleId)
        .orElseThrow(() -> new RuntimeException("Module not found")));
  }

  public ModuleDTO createModule(Long courseId, ModuleDTO dto) {
    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> new RuntimeException("Course not found"));
    com.qlc.models.entities.Module module = new com.qlc.models.entities.Module();
    module.setName(dto.name());
    module.setDescription(dto.description());
    module.setCourse(course);
    return mapToModuleDTO(moduleRepository.save(module));
  }

  public ModuleDTO updateModule(Long moduleId, ModuleDTO dto) {
    com.qlc.models.entities.Module module = moduleRepository.findById(moduleId)
        .orElseThrow(() -> new RuntimeException("Module not found"));
    module.setName(dto.name());
    module.setDescription(dto.description());
    return mapToModuleDTO(moduleRepository.save(module));
  }

  public void deleteModule(Long moduleId) {
    moduleRepository.deleteById(moduleId);
  }

  private ModuleDTO mapToModuleDTO(com.qlc.models.entities.Module m) {
    return new ModuleDTO(m.getId(), m.getCourse().getId(), m.getName(), m.getDescription());
  }

  // --- Lesson CRUD ---
  public List<LessonDTO> getLessonsByModuleId(Long moduleId) {
    return lessonRepository.findByModuleId(moduleId).stream()
        .map(this::mapToLessonDTO)
        .toList();
  }

  public LessonDTO getLessonById(Long lessonId) {
    return mapToLessonDTO(lessonRepository.findById(lessonId)
        .orElseThrow(() -> new RuntimeException("Lesson not found")));
  }

  public LessonDTO createLesson(Long moduleId, LessonDTO dto) {
    com.qlc.models.entities.Module module = moduleRepository.findById(moduleId)
        .orElseThrow(() -> new RuntimeException("Module not found"));
    Lesson lesson = new Lesson();
    lesson.setName(dto.name());
    lesson.setDescription(dto.description());
    lesson.setModule(module);
    return mapToLessonDTO(lessonRepository.save(lesson));
  }

  public LessonDTO updateLesson(Long lessonId, LessonDTO dto) {
    Lesson lesson = lessonRepository.findById(lessonId)
        .orElseThrow(() -> new RuntimeException("Lesson not found"));
    lesson.setName(dto.name());
    lesson.setDescription(dto.description());
    return mapToLessonDTO(lessonRepository.save(lesson));
  }

  public void deleteLesson(Long lessonId) {
    lessonRepository.deleteById(lessonId);
  }

  private LessonDTO mapToLessonDTO(Lesson l) {
    return new LessonDTO(l.getId(), l.getModule().getId(), l.getName(), l.getDescription());
  }

  // --- Task CRUD ---
  public List<TaskDTO> getTasksByLessonId(Long lessonId) {
    return taskRepository.findByLessonId(lessonId).stream()
        .map(this::mapToTaskDTO)
        .toList();
  }

  public TaskDTO getTaskById(Long taskId) {
    Task t = taskRepository.findById(taskId)
        .orElseThrow(() -> new RuntimeException("Task not found with id: " + taskId));
    return mapToTaskDTO(t);
  }

  public TaskDTO createTask(Long lessonId, TaskDTO dto) {
    Lesson lesson = lessonRepository.findById(lessonId)
        .orElseThrow(() -> new RuntimeException("Lesson not found"));

    Task task = instantiateTask(dto.taskType());
    task.setLesson(lesson);
    updateTaskFields(task, dto);

    return mapToTaskDTO(taskRepository.save(task));
  }

  public TaskDTO updateTask(Long taskId, TaskDTO dto) {
    Task task = taskRepository.findById(taskId)
        .orElseThrow(() -> new RuntimeException("Task not found"));
    updateTaskFields(task, dto);
    return mapToTaskDTO(taskRepository.save(task));
  }

  public void deleteTask(Long taskId) {
    taskRepository.deleteById(taskId);
  }

  private Task instantiateTask(String type) {
    if (type == null)
      throw new IllegalArgumentException("Task type cannot be null");
    return switch (type.toUpperCase()) {
      case "CODE" -> new CodeTask();
      case "TEST" -> new TestTask();
      case "NUMERIC" -> new NumericTask();
      default -> throw new IllegalArgumentException("Unknown task type: " + type);
    };
  }

  private void updateTaskFields(Task task, TaskDTO dto) {
    task.setTaskText(dto.taskText());
    if (task instanceof CodeTask ct) {
      ct.setTemplateCode(dto.templateCode());
      ct.setTestCases(dto.testCases());
    } else if (task instanceof TestTask tt) {
      tt.setOptions(dto.options());
      tt.setCorrectOptionIndex(dto.correctOptionIndex());
    } else if (task instanceof NumericTask nt) {
      nt.setCorrectNumericAnswer(dto.correctNumericAnswer());
    }
  }

  private TaskDTO mapToTaskDTO(Task t) {
    String templateCode = null;
    String testCases = null;
    List<String> options = null;
    Integer correctOptionIndex = null;
    BigDecimal correctNumericAnswer = null;

    if (t instanceof CodeTask ct) {
      templateCode = ct.getTemplateCode();
      testCases = ct.getTestCases();
    } else if (t instanceof TestTask tt) {
      options = tt.getOptions();
      correctOptionIndex = tt.getCorrectOptionIndex();
    } else if (t instanceof NumericTask nt) {
      correctNumericAnswer = nt.getCorrectNumericAnswer();
    }

    return new TaskDTO(
        t.getId(),
        t.getLesson().getId(),
        t.getTaskType(),
        t.getTaskText(),
        templateCode,
        testCases,
        options,
        correctOptionIndex,
        correctNumericAnswer);
  }
}
