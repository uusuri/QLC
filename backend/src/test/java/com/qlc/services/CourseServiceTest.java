package com.qlc.services;

import com.qlc.models.dtos.CourseDTO;
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

  @BeforeEach
  void setUp() {
    sampleCourse = new Course();
    sampleCourse.setId(1L);
    sampleCourse.setName("Java Core");
    sampleCourse.setDescription("Learn Java from scratch");
    sampleCourse.setPrice(BigDecimal.TEN);
    sampleCourse.setPriceInStars(new BigDecimal("100"));
  }

  @Nested
  @DisplayName("Course CRUD Tests")
  class CourseCrudTests {

    @Test
    @DisplayName("Should return all courses")
    void getAllCourses_ShouldReturnList() {
      when(courseRepository.findAll()).thenReturn(List.of(sampleCourse));

      List<CourseDTO> result = courseService.getAllCourses();

      assertNotNull(result);
      assertEquals(1, result.size());
      assertEquals("Java Core", result.get(0).name());
      verify(courseRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("Should find course by ID when it exists")
    void getCourseById_WhenExists_ShouldReturnDto() {
      when(courseRepository.findById(1L)).thenReturn(Optional.of(sampleCourse));

      CourseDTO result = courseService.getCourseById(1L);

      assertNotNull(result);
      assertEquals(1L, result.id());
      assertEquals("Java Core", result.name());
    }

    @Test
    @DisplayName("Should throw exception when course not found by ID")
    void getCourseById_WhenNotFound_ShouldThrowException() {
      when(courseRepository.findById(1L)).thenReturn(Optional.empty());

      RuntimeException exception = assertThrows(RuntimeException.class, () -> courseService.getCourseById(1L));

      assertEquals("Course not found", exception.getMessage());
    }

    @Test
    @DisplayName("Should create course with defaults when prices are null")
    void createCourse_WithNullPrices_ShouldUseZero() {
      CourseDTO inputDto = new CourseDTO(null, "New", "Desc", null, null);

      // Заглушка для сохранения — возвращаем тот же курс, но с прописанным ID
      when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> {
        Course savedCourse = invocation.getArgument(0);
        savedCourse.setId(2L);
        return savedCourse;
      });

      CourseDTO result = courseService.createCourse(inputDto);

      assertNotNull(result);
      assertEquals(BigDecimal.ZERO, result.price());
      assertEquals(BigDecimal.ZERO, result.priceInStars());
      verify(courseRepository).save(any(Course.class));
    }
  }

  @Nested
  @DisplayName("Polymorphic Task Creation Tests")
  class TaskCreationTests {

    private Lesson sampleLesson;

    @BeforeEach
    void setUpTaskContext() {
      sampleLesson = new Lesson();
      sampleLesson.setId(10L);

      Module sampleModule = new Module();
      sampleModule.setId(5L);
      sampleModule.setCourse(sampleCourse);
      sampleLesson.setModule(sampleModule);
    }

    @Test
    @DisplayName("Should create CodeTask successfully")
    void createTask_CodeType_ShouldInstantiateCodeTask() {
      TaskDTO requestDto = new TaskDTO(
          null, 10L, "CODE", "Write Hello World",
          "public class...", "{testCases: []}", null, null, null);

      when(lessonRepository.findById(10L)).thenReturn(Optional.of(sampleLesson));
      when(taskRepository.save(any(CodeTask.class))).thenAnswer(invocation -> {
        CodeTask ct = invocation.getArgument(0);
        ct.setId(100L);
        return ct;
      });

      TaskDTO result = courseService.createTask(10L, requestDto);

      assertNotNull(result);
      assertEquals(100L, result.id());
      assertEquals("CODE", result.taskType());
      assertEquals("public class...", result.templateCode());
      assertNull(result.correctOptionIndex()); // Поля тестов должны быть null
    }

    @Test
    @DisplayName("Should create TestTask successfully")
    void createTask_TestType_ShouldInstantiateTestTask() {
      TaskDTO requestDto = new TaskDTO(
          null, 10L, "TEST", "Select keyword",
          null, null, List.of("class", "struct"), 0, null);

      when(lessonRepository.findById(10L)).thenReturn(Optional.of(sampleLesson));
      when(taskRepository.save(any(TestTask.class))).thenAnswer(invocation -> {
        TestTask tt = invocation.getArgument(0);
        tt.setId(101L);
        return tt;
      });

      TaskDTO result = courseService.createTask(10L, requestDto);

      assertNotNull(result);
      assertEquals(101L, result.id());
      assertEquals("TEST", result.taskType());
      assertEquals(0, result.correctOptionIndex());
      assertNull(result.templateCode()); // Поля кода должны быть null
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException for unknown task type")
    void createTask_UnknownType_ShouldThrowException() {
      TaskDTO requestDto = new TaskDTO(
          null, 10L, "INVALID_TYPE", "Text",
          null, null, null, null, null);

      when(lessonRepository.findById(10L)).thenReturn(Optional.of(sampleLesson));

      IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
          () -> courseService.createTask(10L, requestDto));

      assertTrue(exception.getMessage().contains("Unknown task type"));
      verify(taskRepository, never()).save(any());
    }
  }
}
