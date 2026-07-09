package com.qlc.services;

import com.qlc.models.dtos.CourseDTO;
import com.qlc.models.dtos.LessonDTO;
import com.qlc.models.dtos.ModuleDTO;
import com.qlc.models.dtos.TaskDTO;
import com.qlc.models.entities.*;
import com.qlc.models.entities.Module;
import com.qlc.repositories.CourseRepository;
import com.qlc.repositories.LessonRepository;
import com.qlc.repositories.ModuleRepository;
import com.qlc.repositories.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseServiceTest {

  @Mock
  private CourseRepository courseRepository;
  @Mock
  private ModuleRepository moduleRepository;
  @Mock
  private LessonRepository lessonRepository;
  @Mock
  private TaskRepository taskRepository;

  @InjectMocks
  private CourseService courseService;

  private Course sampleCourse;
  private Module sampleModule;
  private Lesson sampleLesson;

  @BeforeEach
  void setUp() {
    sampleCourse = new Course();
    sampleCourse.setId(1L);
    sampleCourse.setName("Java Core");
    sampleCourse.setDescription("Base course");
    sampleCourse.setPrice(BigDecimal.TEN);
    sampleCourse.setPriceInStars(new BigDecimal("100"));

    sampleModule = new Module();
    sampleModule.setId(10L);
    sampleModule.setName("OOP");
    sampleModule.setDescription("OOP Principles");
    sampleModule.setCourse(sampleCourse);

    sampleLesson = new Lesson();
    sampleLesson.setId(100L);
    sampleLesson.setName("Polymorphism");
    sampleLesson.setDescription("Intro to poly");
    sampleLesson.setModule(sampleModule);
    sampleLesson.setPublished(true);
  }

  // COURSE CRUD TESTS
  @Nested
  @DisplayName("Course CRUD Tests")
  class CourseCrudTests {

    @Test
    void getAllCourses_ShouldReturnList() {
      when(courseRepository.findAllByPublishedTrue()).thenReturn(List.of(sampleCourse));
      List<CourseDTO> result = courseService.getAllCourses();
      assertEquals(1, result.size());
      assertEquals("Java Core", result.get(0).name());
    }

    @Test
    void getCourseById_Success() {
      when(courseRepository.findByIdAndPublishedTrue(1L)).thenReturn(Optional.of(sampleCourse));
      CourseDTO result = courseService.getCourseById(1L);
      assertEquals("Java Core", result.name());
    }

    @Test
    void getCourseById_NotFound_ShouldThrow() {
      when(courseRepository.findByIdAndPublishedTrue(1L)).thenReturn(Optional.empty());
      assertThrows(RuntimeException.class, () -> courseService.getCourseById(1L));
    }

    @Test
    void createCourse_ShouldSaveAndReturn() {
      CourseDTO dto = new CourseDTO(null, "Go", "Go course", BigDecimal.ONE, BigDecimal.TEN);
      when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));

      CourseDTO result = courseService.createCourse(dto);
      assertEquals("Go", result.name());
      assertEquals(BigDecimal.ONE, result.price());
    }

    @Test
    void updateCourse_Success() {
      CourseDTO updateDto = new CourseDTO(null, "Updated Name", "Updated Desc", BigDecimal.ONE, BigDecimal.TEN);
      when(courseRepository.findById(1L)).thenReturn(Optional.of(sampleCourse));
      when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));

      CourseDTO result = courseService.updateCourse(1L, updateDto);
      assertEquals("Updated Name", result.name());
      assertEquals("Updated Desc", result.description());
    }

    @Test
    void updateCourse_NotFound_ShouldThrow() {
      CourseDTO dto = new CourseDTO(null, "X", "X", null, null);
      when(courseRepository.findById(1L)).thenReturn(Optional.empty());
      assertThrows(RuntimeException.class, () -> courseService.updateCourse(1L, dto));
    }

    @Test
    void deleteCourse_ShouldCallRepository() {
      doNothing().when(courseRepository).deleteById(1L);
      courseService.deleteCourse(1L);
      verify(courseRepository, times(1)).deleteById(1L);
    }
  }

  // MODULE CRUD TESTS
  @Nested
  @DisplayName("Module CRUD Tests")
  class ModuleCrudTests {

    @Test
    void getModulesByCourseId_ShouldReturnList() {
      when(moduleRepository.findByCourseIdOrderByPositionAsc(1L)).thenReturn(List.of(sampleModule));
      List<ModuleDTO> result = courseService.getModulesByCourseId(1L);
      assertEquals(1, result.size());
      assertEquals("OOP", result.get(0).name());
    }

    @Test
    @DisplayName("REQUIREMENT: Modules list must be stably sorted by position parameter")
    void getModulesByCourseId_ShouldMaintainStablePositionOrder() {
      // Arrange
      Module secondModule = new Module();
      secondModule.setId(20L);
      secondModule.setName("Advanced OOP");
      secondModule.setPosition(1);
      secondModule.setCourse(sampleCourse); // Полная связь

      sampleModule.setPosition(0);

      when(moduleRepository.findByCourseIdOrderByPositionAsc(1L))
          .thenReturn(List.of(sampleModule, secondModule));

      // Act
      List<ModuleDTO> result = courseService.getModulesByCourseId(1L);

      // Assert
      assertEquals(2, result.size());
      assertEquals("OOP", result.get(0).name());
      assertEquals("Advanced OOP", result.get(1).name());
    }

    @Test
    void getModuleById_Success() {
      when(moduleRepository.findById(10L)).thenReturn(Optional.of(sampleModule));
      ModuleDTO result = courseService.getModuleById(10L);
      assertEquals("OOP", result.name());
    }

    @Test
    void getModuleById_NotFound_ShouldThrow() {
      when(moduleRepository.findById(10L)).thenReturn(Optional.empty());
      assertThrows(RuntimeException.class, () -> courseService.getModuleById(10L));
    }

    @Test
    void createModule_Success() {
      ModuleDTO dto = new ModuleDTO(null, null, "Exceptions", "Error handling", null);
      when(courseRepository.findById(1L)).thenReturn(Optional.of(sampleCourse));
      when(moduleRepository.save(any(Module.class))).thenAnswer(i -> i.getArgument(0));

      ModuleDTO result = courseService.createModule(1L, dto);
      assertEquals("Exceptions", result.name());
    }

    @Test
    void updateModule_Success() {
      ModuleDTO dto = new ModuleDTO(null, null, "New OOP", "New Desc", null);
      when(moduleRepository.findById(10L)).thenReturn(Optional.of(sampleModule));
      when(moduleRepository.save(any(Module.class))).thenAnswer(i -> i.getArgument(0));

      ModuleDTO result = courseService.updateModule(10L, dto);
      assertEquals("New OOP", result.name());
    }

    @Test
    void deleteModule_ShouldCallRepository() {
      doNothing().when(moduleRepository).deleteById(10L);
      courseService.deleteModule(10L);
      verify(moduleRepository, times(1)).deleteById(10L);
    }
  }

  // LESSON CRUD TESTS
  @Nested
  @DisplayName("Lesson CRUD Tests")
  class LessonCrudTests {

    @Test
    void getLessonsByModuleId_ShouldReturnList() {
      when(lessonRepository.findByModuleIdOrderByPositionAsc(10L)).thenReturn(List.of(sampleLesson));
      List<LessonDTO> result = courseService.getLessonsByModuleId(10L);
      assertEquals(1, result.size());
      assertEquals("Polymorphism", result.get(0).name());
    }

    @Test
    void getLessonById_Success() {
      when(lessonRepository.findById(100L)).thenReturn(Optional.of(sampleLesson));
      LessonDTO result = courseService.getLessonById(100L);
      assertEquals("Polymorphism", result.name());
    }

    @Test
    @DisplayName("SECURITY REQUIREMENT: Unreleased or coming_soon lessons must hide content_md payload")
    void getLessonById_ComingSoon_ShouldHideContentMarkdown() {
      // Arrange
      // Модифицируем готовый sampleLesson, у которого граф связей уже настроен в
      // setUp()
      sampleLesson.setId(101L);
      sampleLesson.setName("Spring Security Advanced");
      sampleLesson.setContentMd("# Super Secret Content That Users Shouldn't See Yet");
      sampleLesson.setPublished(false); // Прячем

      when(lessonRepository.findById(101L)).thenReturn(Optional.of(sampleLesson));

      // Act
      LessonDTO result = courseService.getLessonById(101L);

      // Assert
      assertNotNull(result);
      assertEquals("Spring Security Advanced", result.name());
      assertNull(result.contentMd(),
          "Контент неопубликованного урока ОБЯЗАН быть null в DTO, чтобы фронт его не слил!");
    }

    @Test
    void createLesson_Success() {
      LessonDTO dto = new LessonDTO(null, null, "Inheritance", "Desc", null, null, null);
      when(moduleRepository.findById(10L)).thenReturn(Optional.of(sampleModule));
      when(lessonRepository.save(any(Lesson.class))).thenAnswer(i -> i.getArgument(0));

      LessonDTO result = courseService.createLesson(10L, dto);
      assertEquals("Inheritance", result.name());
    }

    @Test
    void updateLesson_Success() {
      LessonDTO dto = new LessonDTO(null, null, "Super Poly", "Desc", null, null, null);
      when(lessonRepository.findById(100L)).thenReturn(Optional.of(sampleLesson));
      when(lessonRepository.save(any(Lesson.class))).thenAnswer(i -> i.getArgument(0));

      LessonDTO result = courseService.updateLesson(100L, dto);
      assertEquals("Super Poly", result.name());
    }

    @Test
    void deleteLesson_ShouldCallRepository() {
      doNothing().when(lessonRepository).deleteById(100L);
      courseService.deleteLesson(100L);
      verify(lessonRepository, times(1)).deleteById(100L);
    }
  }

  // TASK CRUD TESTS (WITH POLYMORPHISM)
  @Nested
  @DisplayName("Task CRUD & Polymorphic Fields Tests")
  class TaskCrudTests {

    @Test
    void getTasksByLessonId_ShouldReturnMappedList() {
      CodeTask codeTask = new CodeTask();
      codeTask.setId(200L);
      codeTask.setLesson(sampleLesson);
      codeTask.setStatementMd("Write code");
      codeTask.setTemplateCode("int main()");

      when(taskRepository.findByLessonId(100L)).thenReturn(List.of(codeTask));

      List<TaskDTO> result = courseService.getTasksByLessonId(100L);
      assertEquals(1, result.size());
      assertEquals("CODE", result.get(0).taskType());
      assertEquals("int main()", result.get(0).templateCode());
    }

    @Test
    void getTaskById_Success() {
      NumericTask numericTask = new NumericTask();
      numericTask.setId(300L);
      numericTask.setLesson(sampleLesson);
      numericTask.setStatementMd("What is 2+2?");
      numericTask.setCorrectNumericAnswer(new BigDecimal("4"));

      when(taskRepository.findById(300L)).thenReturn(Optional.of(numericTask));

      TaskDTO result = courseService.getTaskById(300L);
      assertEquals("NUMERIC", result.taskType());
      assertEquals(new BigDecimal("4"), result.correctNumericAnswer());
    }

    @Test
    void updateTask_CodeTask_ShouldUpdateSpecificFields() {
      CodeTask existingTask = new CodeTask();
      existingTask.setId(200L);
      existingTask.setLesson(sampleLesson);
      existingTask.setStatementMd("Old Text");

      TaskDTO updateDto = new TaskDTO(null, null, "CODE", "New Text",
          null, null, null, null, null, "new template", "new test cases",
          null, null, null);

      when(taskRepository.findById(200L)).thenReturn(Optional.of(existingTask));
      when(taskRepository.save(any(Task.class))).thenAnswer(i -> i.getArgument(0));

      TaskDTO result = courseService.updateTask(200L, updateDto);
      assertEquals("New Text", result.statementMd());
      assertEquals("new template", result.templateCode());
      assertEquals("new test cases", result.testCases());
    }

    @Test
    void updateTask_TestTask_ShouldUpdateSpecificFields() {
      TestTask existingTask = new TestTask();
      existingTask.setId(201L);
      existingTask.setLesson(sampleLesson);
      // Инициализируем пустые списки в сущности, чтобы маппер не поймал
      // NullPointerException при первом обращении
      existingTask.setOptions(new ArrayList<>());
      existingTask.setCorrectOptionIndexes(new ArrayList<>());

      // Сборка DTO: передаем список правильных индексов List.of(1) на место нужного
      // аргумента
      TaskDTO updateDto = new TaskDTO(
          null, null, "TEST", "Test Statement",
          null, null, null, null, null, null, null,
          List.of("Option A", "Option B"),
          List.of(1),
          null);

      when(taskRepository.findById(201L)).thenReturn(Optional.of(existingTask));
      when(taskRepository.save(any(Task.class))).thenAnswer(i -> i.getArgument(0));

      TaskDTO result = courseService.updateTask(201L, updateDto);

      // Проверяем размер списка правильных ответов и само значение внутри него
      assertEquals(1, result.correctOptionIndexes().size());
      assertEquals(1, result.correctOptionIndexes().get(0));

      // Проверяем варианты ответов
      assertEquals(2, result.options().size());
      assertEquals("Option A", result.options().get(0));
    }

    @Test
    void deleteTask_ShouldCallRepository() {
      doNothing().when(taskRepository).deleteById(200L);
      courseService.deleteTask(200L);
      verify(taskRepository, times(1)).deleteById(200L);
    }
  }
}
