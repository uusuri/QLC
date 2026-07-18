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

import java.util.ArrayList;
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
    return courseRepository.findAllByPublishedTrue().stream()
        .map(this::mapToCourseDTO)
        .toList();
  }

  public CourseDTO getCourseById(Long courseId) {
    Course c = courseRepository.findByIdAndPublishedTrue(courseId)
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
    return new CourseDTO(
        c.getId(),
        c.getName(),
        c.getDescription(),
        c.getPrice(),
        c.getPriceInStars());
  }

  // --- Module CRUD ---
  public List<ModuleDTO> getModulesByCourseId(Long courseId) {
    return moduleRepository.findByCourseIdOrderByPositionAsc(courseId).stream()
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
    module.setPosition(dto.position() != null ? dto.position() : 0);
    module.setCourse(course);
    return mapToModuleDTO(moduleRepository.save(module));
  }

  public ModuleDTO updateModule(Long moduleId, ModuleDTO dto) {
    com.qlc.models.entities.Module module = moduleRepository.findById(moduleId)
        .orElseThrow(() -> new RuntimeException("Module not found"));
    module.setName(dto.name());
    module.setDescription(dto.description());
    module.setPosition(dto.position() != null ? dto.position() : module.getPosition());
    return mapToModuleDTO(moduleRepository.save(module));
  }

  public void deleteModule(Long moduleId) {
    moduleRepository.deleteById(moduleId);
  }

  private ModuleDTO mapToModuleDTO(com.qlc.models.entities.Module m) {
    return new ModuleDTO(
        m.getId(),
        m.getCourse().getId(),
        m.getName(),
        m.getDescription(),
        m.getPosition());
  }

  // --- Lesson CRUD ---
  public List<LessonDTO> getLessonsByModuleId(Long moduleId) {
    return lessonRepository.findByModuleIdOrderByPositionAsc(moduleId).stream()
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
    lesson.setPosition(dto.position() != null ? dto.position() : 0);
    lesson.setContentMd(dto.contentMd());
    lesson.setPublished(dto.published() != null ? dto.published() : true);
    lesson.setModule(module);
    return mapToLessonDTO(lessonRepository.save(lesson));
  }

  public LessonDTO updateLesson(Long lessonId, LessonDTO dto) {
    Lesson lesson = lessonRepository.findById(lessonId)
        .orElseThrow(() -> new RuntimeException("Lesson not found"));
    lesson.setName(dto.name());
    lesson.setDescription(dto.description());
    lesson.setPosition(dto.position() != null ? dto.position() : lesson.getPosition());
    lesson.setContentMd(dto.contentMd());
    if (dto.published() != null) {
      lesson.setPublished(dto.published());
    }
    return mapToLessonDTO(lessonRepository.save(lesson));
  }

  public void deleteLesson(Long lessonId) {
    lessonRepository.deleteById(lessonId);
  }

  private LessonDTO mapToLessonDTO(Lesson l) {
    return new LessonDTO(
        l.getId(),
        l.getModule().getId(),
        l.getName(),
        l.getDescription(),
        l.getPosition(),
        l.isPublished() ? l.getContentMd() : null,
        l.isPublished());
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
    task.setStatementMd(dto.statementMd() != null ? dto.statementMd().trim() : "");

    if (task instanceof CodeTask ct) {
      ct.setStarterCode(dto.starterCode());
      ct.setTemplateCode(dto.templateCode());
      ct.setTestCases(dto.testCases());
      ct.setTimeLimitMs(dto.timeLimitMs() != null ? dto.timeLimitMs() : 2000);
      ct.setMemoryLimitKb(dto.memoryLimitKb() != null ? dto.memoryLimitKb() : 65536);
      ct.setOutputLimitKb(dto.outputLimitKb() != null ? dto.outputLimitKb() : 4096);
      ct.setTestSetVersion(dto.testSetVersion() != null ? dto.testSetVersion() : 1);
    } else if (task instanceof TestTask tt) {
      // Безопасно обновляем коллекции элементов
      if (tt.getOptions() != null) {
        tt.getOptions().clear();
        if (dto.options() != null)
          tt.getOptions().addAll(dto.options());
      } else {
        tt.setOptions(dto.options() != null ? new ArrayList<>(dto.options()) : new ArrayList<>());
      }

      if (tt.getCorrectOptionIndexes() != null) {
        tt.getCorrectOptionIndexes().clear();
        if (dto.correctOptionIndexes() != null)
          tt.getCorrectOptionIndexes().addAll(dto.correctOptionIndexes());
      } else {
        tt.setCorrectOptionIndexes(
            dto.correctOptionIndexes() != null ? new ArrayList<>(dto.correctOptionIndexes()) : new ArrayList<>());
      }
    } else if (task instanceof NumericTask nt) {
      nt.setCorrectNumericAnswer(dto.correctNumericAnswer());
    }
  }

  private TaskDTO mapToTaskDTO(Task t) {
    String starterCode = null;
    String templateCode = null;
    String testCases = null;
    Integer timeLimitMs = null;
    Integer memoryLimitKb = null;
    Integer outputLimitKb = null;
    Integer testSetVersion = null;
    List<String> options = null;
    List<Integer> correctOptionIndexes = null;
    BigDecimal correctNumericAnswer = null;

    if (t instanceof CodeTask ct) {
      starterCode = ct.getStarterCode();
      templateCode = ct.getTemplateCode();
      testCases = ct.getTestCases();
      timeLimitMs = ct.getTimeLimitMs();
      memoryLimitKb = ct.getMemoryLimitKb();
      outputLimitKb = ct.getOutputLimitKb();
      testSetVersion = ct.getTestSetVersion();
    } else if (t instanceof TestTask tt) {
      options = tt.getOptions();
      correctOptionIndexes = tt.getCorrectOptionIndexes();
    } else if (t instanceof NumericTask nt) {
      correctNumericAnswer = nt.getCorrectNumericAnswer();
    }

    return new TaskDTO(
        t.getId(),
        t.getLesson().getId(),
        t.getTaskType(),
        t.getStatementMd(),
        starterCode,
        timeLimitMs,
        memoryLimitKb,
        outputLimitKb,
        testSetVersion,
        templateCode,
        testCases,
        options,
        correctOptionIndexes,
        correctNumericAnswer);
  }
}
