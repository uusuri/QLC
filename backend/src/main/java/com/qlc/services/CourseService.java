package com.qlc.services;

import com.qlc.exceptions.ResourceNotFoundException;

import com.qlc.models.entities.*;

import com.qlc.models.dtos.CourseDTO;
import com.qlc.models.dtos.CourseCatalogDTO;
import com.qlc.models.dtos.CourseStructureDTO;
import com.qlc.models.dtos.LearnerTaskDTO;
import com.qlc.models.dtos.LessonDTO;
import com.qlc.models.dtos.ModuleDTO;
import com.qlc.models.dtos.ModuleWithLessonsDTO;
import com.qlc.models.dtos.TaskDTO;
import com.qlc.models.dtos.TaskOutlineDTO;
import com.qlc.models.responses.LessonLearnResponse;

import com.qlc.repositories.CourseRepository;
import com.qlc.repositories.LessonRepository;
import com.qlc.repositories.ModuleRepository;
import com.qlc.repositories.TaskRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class CourseService {

  private final CourseRepository courseRepository;
  private final ModuleRepository moduleRepository;
  private final LessonRepository lessonRepository;
  private final TaskRepository taskRepository;
  private final PurchaseService purchaseService;
  private final com.qlc.repositories.UserCourseRepository userCourses;
  private final com.qlc.repositories.SubmissionRepository submissions;

  public CourseService(CourseRepository courseRepository, ModuleRepository moduleRepository,
      LessonRepository lessonRepository, TaskRepository taskRepository,
      PurchaseService purchaseService, com.qlc.repositories.SubmissionRepository submissions,
      com.qlc.repositories.UserCourseRepository userCourses) {
    this.submissions = submissions;
    this.userCourses = userCourses;
    this.courseRepository = courseRepository;
    this.moduleRepository = moduleRepository;
    this.lessonRepository = lessonRepository;
    this.taskRepository = taskRepository;
    this.purchaseService = purchaseService;
  }

  // --- Course CRUD ---
  public List<CourseDTO> getAllCourses() {
    return courseRepository.findAllByPublishedTrue().stream()
        .map(this::mapToCourseDTO)
        .toList();
  }

  public CourseDTO getCourseById(Long courseId) {
    Course c = courseRepository.findByIdAndPublishedTrue(courseId)
        .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
    return mapToCourseDTO(c);
  }

  public List<CourseCatalogDTO> getPublishedCatalog() {
    return courseRepository.findPublishedCatalog();
  }

  public CourseStructureDTO getCourseStructure(Long courseId) {
    Course course = courseRepository.findByIdAndPublishedTrue(courseId)
        .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
    List<com.qlc.models.entities.Module> modules =
        moduleRepository.findByCourseIdOrderByPositionAsc(courseId);
    Map<Long, List<LessonDTO>> lessonsByModule = new LinkedHashMap<>();

    for (Lesson lesson : lessonRepository.findByCourseIdOrdered(courseId)) {
      lessonsByModule.computeIfAbsent(lesson.getModule().getId(), ignored -> new ArrayList<>())
          .add(mapToLessonSummaryDTO(lesson));
    }

    List<ModuleWithLessonsDTO> moduleDtos = modules.stream()
        .map(module -> new ModuleWithLessonsDTO(
            mapToModuleDTO(module),
            lessonsByModule.getOrDefault(module.getId(), List.of())))
        .toList();

    return new CourseStructureDTO(mapToCourseDTO(course), moduleDtos);
  }

  @Transactional
  public CourseDTO createCourse(CourseDTO dto) {
    Course course = new Course();
    course.setName(dto.name());
    course.setDescription(dto.description());
    course.setPrice(dto.price() != null ? dto.price() : BigDecimal.ZERO);
    course.setPriceInStars(dto.priceInStars() != null ? dto.priceInStars() : BigDecimal.ZERO);
    updateCourseLanguages(course, dto);
    return mapToCourseDTO(courseRepository.save(course));
  }

  @Transactional
  public CourseDTO updateCourse(Long courseId, CourseDTO dto) {
    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
    course.setName(dto.name());
    course.setDescription(dto.description());
    if (dto.price() != null)
      course.setPrice(dto.price());
    if (dto.priceInStars() != null)
      course.setPriceInStars(dto.priceInStars());
    updateCourseLanguages(course, dto);
    return mapToCourseDTO(courseRepository.save(course));
  }

  private void updateCourseLanguages(Course course, CourseDTO dto) {
    if (dto.multilingual() != null) course.setMultilingual(dto.multilingual());
    if (dto.availableLanguages() != null) {
      if (dto.availableLanguages().isEmpty() || dto.availableLanguages().stream()
          .anyMatch(language -> !CourseLanguageService.CONFIGURABLE_LANGUAGES.contains(language))) {
        throw new IllegalArgumentException("Choose supported course languages");
      }
      course.getAvailableLanguages().clear();
      course.getAvailableLanguages().addAll(dto.availableLanguages());
    }
    if (!course.isMultilingual() && course.getAvailableLanguages().size() != 1) {
      throw new IllegalArgumentException("A single-language course must have exactly one language");
    }
  }

  @Transactional
  public void deleteCourse(Long courseId) {
    courseRepository.deleteById(courseId);
  }

  private CourseDTO mapToCourseDTO(Course c) {
    return new CourseDTO(
        c.getId(),
        c.getName(),
        c.getDescription(),
        c.getPrice(),
        c.getPriceInStars(),
        c.isMultilingual(),
        c.getAvailableLanguages().stream().sorted().toList());
  }

  // --- Module CRUD ---
  public List<ModuleDTO> getModulesByCourseId(Long courseId) {
    return moduleRepository.findByCourseIdOrderByPositionAsc(courseId).stream()
        .map(this::mapToModuleDTO)
        .toList();
  }

  public ModuleDTO getModuleById(Long moduleId) {
    return mapToModuleDTO(moduleRepository.findById(moduleId)
        .orElseThrow(() -> new ResourceNotFoundException("Module not found")));
  }

  @Transactional
  public ModuleDTO createModule(Long courseId, ModuleDTO dto) {
    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
    com.qlc.models.entities.Module module = new com.qlc.models.entities.Module();
    module.setName(dto.name());
    module.setDescription(dto.description());
    module.setPosition(dto.position() != null ? dto.position() : 0);
    module.setCourse(course);
    return mapToModuleDTO(moduleRepository.save(module));
  }

  @Transactional
  public ModuleDTO updateModule(Long moduleId, ModuleDTO dto) {
    com.qlc.models.entities.Module module = moduleRepository.findById(moduleId)
        .orElseThrow(() -> new ResourceNotFoundException("Module not found"));
    module.setName(dto.name());
    module.setDescription(dto.description());
    module.setPosition(dto.position() != null ? dto.position() : module.getPosition());
    return mapToModuleDTO(moduleRepository.save(module));
  }

  @Transactional
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
        .map(l -> new LessonDTO(
            l.getId(),
            l.getModule().getId(),
            l.getName(),
            l.getDescription(),
            l.getPosition(),
            null,
            l.isPublished()))
        .toList();
  }

  public LessonDTO getLessonById(Long lessonId) {
    return mapToLessonSummaryDTO(lessonRepository.findById(lessonId)
        .orElseThrow(() -> new ResourceNotFoundException("Lesson not found")));
  }

  public LessonDTO getLessonForAdmin(Long lessonId) {
    return mapToAdminLessonDTO(lessonRepository.findById(lessonId)
        .orElseThrow(() -> new ResourceNotFoundException("Lesson not found")));
  }

  public LessonDTO getLessonForUser(Long lessonId, Long userId) {
    Lesson lesson = lessonRepository.findByIdWithModuleAndCourse(lessonId)
        .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));

    boolean visible = canReadLesson(lesson, userId);

    return new LessonDTO(
        lesson.getId(),
        lesson.getModule().getId(),
        lesson.getName(),
        lesson.getDescription(),
        lesson.getPosition(),
        visible ? resolveTheory(lesson, userId).contentMd() : null,
        lesson.isPublished());
  }

  public boolean hasUserAccessToCourse(Long courseId, Long userId) {
    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
    if (isCourseFree(course)) {
      return true;
    }
    return purchaseService.hasAccess(userId, courseId);
  }

  public LessonLearnResponse getLessonWithTasksForUser(Long lessonId, Long userId) {
    Lesson lesson = lessonRepository.findByIdWithModuleAndCourse(lessonId)
        .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));

    Course course = lesson.getModule().getCourse();
    boolean visible = canReadLesson(lesson, userId);

    LessonDTO lessonDto = new LessonDTO(
        lesson.getId(),
        lesson.getModule().getId(),
        lesson.getName(),
        lesson.getDescription(),
        lesson.getPosition(),
        visible ? resolveTheory(lesson, userId).contentMd() : null,
        lesson.isPublished());

    List<LearnerTaskDTO> tasks = visible
        ? taskRepository.findByLessonId(lesson.getId()).stream()
            .map(this::mapToLearnerTaskDTO)
            .toList()
        : List.of();

    return new LessonLearnResponse(
        mapToCourseDTO(course),
        mapToModuleDTO(lesson.getModule()),
        lessonDto,
        tasks,
        visible && userId != null ? submissions.findAcceptedTaskIdsByUserId(userId).stream()
            .filter(id -> tasks.stream().anyMatch(task -> task.id().equals(id))).toList() : List.of(),
        visible);
  }

  public com.qlc.models.dtos.LessonTheoryDTO getLessonTheory(Long lessonId, Long userId) {
    Lesson lesson = lessonRepository.findByIdWithModuleAndCourse(lessonId)
        .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));
    if (!canReadLesson(lesson, userId)) {
      throw new org.springframework.security.access.AccessDeniedException("Lesson is not available");
    }
    return resolveTheory(lesson, userId);
  }

  private com.qlc.models.dtos.LessonTheoryDTO resolveTheory(Lesson lesson, Long userId) {
    Course course = lesson.getModule().getCourse();
    if (!course.isMultilingual() || userId == null) {
      return new com.qlc.models.dtos.LessonTheoryDTO(lesson.getContentMd(), null, false);
    }
    String language = userCourses.findById(new UserCourseId(userId, course.getId()))
        .map(UserCourse::getSelectedLanguage).orElse(null);
    String variant = language != null && course.getAvailableLanguages().contains(language)
        ? lesson.getContentByLanguage().get(language) : null;
    if (variant == null && "PYPY312".equals(language)) {
      // Interpreter variants share the same Python theory unless explicitly authored.
      variant = lesson.getContentByLanguage().get("PYTHON312");
    }
    return variant == null
        ? new com.qlc.models.dtos.LessonTheoryDTO(lesson.getContentMd(), null, language != null)
        : new com.qlc.models.dtos.LessonTheoryDTO(variant, language, false);
  }

  private boolean canReadLesson(Lesson lesson, Long userId) {
    Course course = lesson.getModule().getCourse();
    return lesson.isPublished() && course.isPublished()
        && (isCourseFree(course) || (userId != null && purchaseService.hasAccess(userId, course.getId())));
  }

  @Transactional
  public LessonDTO createLesson(Long moduleId, LessonDTO dto) {
    com.qlc.models.entities.Module module = moduleRepository.findById(moduleId)
        .orElseThrow(() -> new ResourceNotFoundException("Module not found"));
    Lesson lesson = new Lesson();
    lesson.setName(dto.name());
    lesson.setDescription(dto.description());
    lesson.setPosition(dto.position() != null ? dto.position() : 0);
    lesson.setContentMd(dto.contentMd());
    updateTheoryVariants(lesson, dto);
    lesson.setPublished(dto.published() != null ? dto.published() : true);
    lesson.setModule(module);
    return mapToAdminLessonDTO(lessonRepository.save(lesson));
  }

  @Transactional
  public LessonDTO updateLesson(Long lessonId, LessonDTO dto) {
    Lesson lesson = lessonRepository.findById(lessonId)
        .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));
    lesson.setName(dto.name());
    lesson.setDescription(dto.description());
    lesson.setPosition(dto.position() != null ? dto.position() : lesson.getPosition());
    lesson.setContentMd(dto.contentMd());
    updateTheoryVariants(lesson, dto);
    if (dto.published() != null) {
      lesson.setPublished(dto.published());
    }
    return mapToAdminLessonDTO(lessonRepository.save(lesson));
  }

  private void updateTheoryVariants(Lesson lesson, LessonDTO dto) {
    if (dto.contentByLanguage() == null) return; // Older clients preserve authored variants.
    dto.contentByLanguage().forEach((language, content) -> {
      if (!CourseLanguageService.CONFIGURABLE_LANGUAGES.contains(language)
          || content == null || content.isBlank() || content.length() > 500_000) {
        throw new IllegalArgumentException("Provide non-empty theory for a supported language");
      }
    });
    lesson.getContentByLanguage().clear();
    lesson.getContentByLanguage().putAll(dto.contentByLanguage());
  }

  @Transactional
  public void deleteLesson(Long lessonId) {
    lessonRepository.deleteById(lessonId);
  }

  private LessonDTO mapToAdminLessonDTO(Lesson l) {
    return new LessonDTO(
        l.getId(),
        l.getModule().getId(),
        l.getName(),
        l.getDescription(),
        l.getPosition(),
        l.getContentMd(),
        l.isPublished(),
        new java.util.LinkedHashMap<>(l.getContentByLanguage()));
  }

  private LessonDTO mapToLessonSummaryDTO(Lesson lesson) {
    return new LessonDTO(
        lesson.getId(),
        lesson.getModule().getId(),
        lesson.getName(),
        lesson.getDescription(),
        lesson.getPosition(),
        null,
        lesson.isPublished());
  }

  // --- Task CRUD ---
  public List<TaskDTO> getTasksByLessonId(Long lessonId) {
    return taskRepository.findByLessonId(lessonId).stream()
        .map(this::mapToTaskDTO)
        .toList();
  }

  public List<TaskOutlineDTO> getTaskOutlinesByLessonId(Long lessonId) {
    Lesson lesson = lessonRepository.findByIdWithModuleAndCourse(lessonId)
        .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));
    if (!lesson.isPublished() || !lesson.getModule().getCourse().isPublished()) {
      return List.of();
    }
    return taskRepository.findByLessonId(lessonId).stream()
        .map(task -> new TaskOutlineDTO(task.getId(), task.getTaskType(), (int) task.getDifficulty()))
        .toList();
  }

  public TaskDTO getTaskById(Long taskId) {
    Task t = taskRepository.findById(taskId)
        .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));
    return mapToTaskDTO(t);
  }

  @Transactional
  public TaskDTO createTask(Long lessonId, TaskDTO dto) {
    Lesson lesson = lessonRepository.findById(lessonId)
        .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));

    Task task = instantiateTask(dto.taskType());
    task.setLesson(lesson);
    updateTaskFields(task, dto);

    return mapToTaskDTO(taskRepository.save(task));
  }

  @Transactional
  public TaskDTO updateTask(Long taskId, TaskDTO dto) {
    Task task = taskRepository.findById(taskId)
        .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
    updateTaskFields(task, dto);
    return mapToTaskDTO(taskRepository.save(task));
  }

  @Transactional
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

    // Missing difficulty keeps the current value for compatibility with older clients.
    if (dto.difficulty() != null) {
      if (dto.difficulty() < 1 || dto.difficulty() > 3) {
        throw new IllegalArgumentException("Task difficulty must be between 1 and 3");
      }
      task.setDifficulty(dto.difficulty().shortValue());
    }

    // Missing field preserves hints when older clients update a task; [] explicitly clears them.
    if (dto.hints() != null) {
      if (dto.hints().size() > 5 || dto.hints().stream()
          .anyMatch(hint -> hint == null || hint.isBlank() || hint.length() > 8000)) {
        throw new IllegalArgumentException("Provide up to 5 non-empty hints, at most 8000 characters each");
      }
      task.getHints().clear();
      dto.hints().stream().map(String::trim).forEach(task.getHints()::add);
    }

    if (task instanceof CodeTask ct) {
      ct.setLanguage(dto.language() == null || dto.language().isBlank() ? "CPP23" : dto.language().trim());
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
    String language = null;
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
      language = ct.getLanguage();
      starterCode = ct.getStarterCode();
      templateCode = ct.getTemplateCode();
      testCases = ct.getTestCases();
      timeLimitMs = ct.getTimeLimitMs();
      memoryLimitKb = ct.getMemoryLimitKb();
      outputLimitKb = ct.getOutputLimitKb();
      testSetVersion = ct.getTestSetVersion();
    } else if (t instanceof TestTask tt) {
      // Materialize collections while the service transaction is still open.
      options = new ArrayList<>(tt.getOptions());
      correctOptionIndexes = new ArrayList<>(tt.getCorrectOptionIndexes());
    } else if (t instanceof NumericTask nt) {
      correctNumericAnswer = nt.getCorrectNumericAnswer();
    }

    return new TaskDTO(
        t.getId(),
        t.getLesson().getId(),
        t.getTaskType(),
        (int) t.getDifficulty(),
        language,
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
        correctNumericAnswer,
        new ArrayList<>(t.getHints()));
  }

  private LearnerTaskDTO mapToLearnerTaskDTO(Task task) {
    String language = null;
    String starterCode = null;
    String templateCode = null;
    Integer timeLimitMs = null;
    Integer memoryLimitKb = null;
    Integer outputLimitKb = null;
    Integer testSetVersion = null;
    List<String> options = null;

    if (task instanceof CodeTask codeTask) {
      language = codeTask.getLanguage();
      starterCode = codeTask.getStarterCode();
      templateCode = codeTask.getTemplateCode();
      timeLimitMs = codeTask.getTimeLimitMs();
      memoryLimitKb = codeTask.getMemoryLimitKb();
      outputLimitKb = codeTask.getOutputLimitKb();
      testSetVersion = codeTask.getTestSetVersion();
    } else if (task instanceof TestTask testTask) {
      options = new ArrayList<>(testTask.getOptions());
    }

    return new LearnerTaskDTO(
        task.getId(),
        task.getLesson().getId(),
        task.getTaskType(),
        (int) task.getDifficulty(),
        language,
        task.getStatementMd(),
        starterCode,
        timeLimitMs,
        memoryLimitKb,
        outputLimitKb,
        testSetVersion,
        templateCode,
        options,
        task instanceof TestTask test && test.getCorrectOptionIndexes() != null
            ? test.getCorrectOptionIndexes().stream().distinct().count() > 1 : null,
        new ArrayList<>(task.getHints()));
  }

  private boolean isCourseFree(Course course) {
    BigDecimal price = course.getPrice();
    BigDecimal stars = course.getPriceInStars();
    boolean priceFree = price == null || price.compareTo(BigDecimal.ZERO) == 0;
    boolean starsFree = stars == null || stars.compareTo(BigDecimal.ZERO) == 0;
    return priceFree && starsFree;
  }
}
