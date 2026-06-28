package com.qlc.services;

import com.qlc.models.requests.SubmissionRequest;
import com.qlc.models.responses.SubmissionCreatedResponse;
import com.qlc.models.responses.SubmissionResponse;
import com.qlc.models.entities.Submission;
import com.qlc.models.entities.Task;
import com.qlc.models.entities.CodeTask;
import com.qlc.models.enums.SubmissionStatus;
import com.qlc.models.enums.Verdict;
import com.qlc.repositories.SubmissionRepository;
import com.qlc.repositories.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubmissionServiceTest {

  @Mock
  private SubmissionRepository submissionRepository;

  @Mock
  private TaskRepository taskRepository;

  @Mock
  private RedisQueueService redisQueueService;

  @InjectMocks
  private SubmissionService submissionService;

  private Task sampleTask;
  private final int MAX_SIZE_FOR_TEST = 100;

  @BeforeEach
  void setUp() {
    // Прокидываем лимит размера, чтобы тест не зависел от внешнего yaml
    ReflectionTestUtils.setField(submissionService, "maxSourceSize", MAX_SIZE_FOR_TEST);

    sampleTask = new CodeTask(); // Берем любого наследника Task
    sampleTask.setId(42L);
    sampleTask.setTaskText("Implement bubble sort");
  }

  @Nested
  @DisplayName("Create Submission Tests")
  class CreateSubmissionTests {

    @Test
    @DisplayName("Should successfully queue a valid submission and push to Redis")
    void createSubmission_Success() {
      // Arrange
      Long taskId = 42L;
      SubmissionRequest request = new SubmissionRequest("CPP23", "#include <iostream>");
      UUID generatedId = UUID.randomUUID();

      // Ставим заглушки на репозитории
      when(taskRepository.findById(taskId)).thenReturn(Optional.of(sampleTask));
      when(submissionRepository.save(any(Submission.class))).thenAnswer(invocation -> {
        Submission s = invocation.getArgument(0);
        s.setId(generatedId);
        return s;
      });

      // Для redisQueueService заглушку делать не обязательно, так как метод void,
      // но Mockito должен знать про этот мок. Любой вызов void-метода на моке по
      // дефолту просто ничего не делает.

      // Act
      SubmissionCreatedResponse response = submissionService.createSubmission(taskId, request);

      // Assert
      assertNotNull(response);
      assertEquals(generatedId, response.id());
      assertEquals("QUEUED", response.status());

      // 1. Проверяем, что сабмишен сохранился в базу с правильными полями
      verify(submissionRepository).save(argThat(submission -> submission.getTask().getId().equals(taskId) &&
          "CPP23".equals(submission.getLanguage()) &&
          "#include <iostream>".equals(submission.getSourceCode()) &&
          submission.getStatus() == SubmissionStatus.QUEUED));

      // 2. САМОЕ ГЛАВНОЕ: проверяем, что метод пуша в Редис был вызван ровно 1 раз с
      // нашим UUID!
      verify(redisQueueService, times(1)).pushToQueue(generatedId);
    }

    @Test
    @DisplayName("Should throw RuntimeException when task does not exist (404 context)")

    void createSubmission_TaskNotFound_ShouldThrow() {
      // Arrange
      Long taskId = 999L;
      SubmissionRequest request = new SubmissionRequest("CPP23", "void main(){}");
      when(taskRepository.findById(taskId)).thenReturn(Optional.empty());

      // Act & Assert
      RuntimeException exception = assertThrows(RuntimeException.class,
          () -> submissionService.createSubmission(taskId, request));

      assertEquals("Task not found with id: " + taskId, exception.getMessage());
      verify(submissionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when source code size exceeds limit (400 context)")
    void createSubmission_SourceCodeTooLarge_ShouldThrow() {
      // Arrange
      Long taskId = 42L;
      // Генерируем строку, которая в байтах больше MAX_SIZE_FOR_TEST (100 байт)
      String massiveSourceCode = "A".repeat(MAX_SIZE_FOR_TEST + 1);
      SubmissionRequest request = new SubmissionRequest("CPP23", massiveSourceCode);

      when(taskRepository.findById(taskId)).thenReturn(Optional.of(sampleTask));

      // Act & Assert
      IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
          () -> submissionService.createSubmission(taskId, request));

      assertTrue(exception.getMessage().contains("Source code size exceeds the allowed limit"));
      verify(submissionRepository, never()).save(any());
    }
  }

  @Nested
  @DisplayName("Get Submission By ID Tests")
  class GetSubmissionByIdTests {

    private UUID submissionId;
    private Submission sampleSubmission;

    @BeforeEach
    void setUpSubmission() {
      submissionId = UUID.randomUUID();
      sampleSubmission = new Submission();
      sampleSubmission.setId(submissionId);
      sampleSubmission.setTask(sampleTask);
      sampleSubmission.setLanguage("CPP23");
      sampleSubmission.setSourceCode("int x = 5;");
      sampleSubmission.setStatus(SubmissionStatus.COMPLETED);
      sampleSubmission.setCreatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("Should return full response when submission exists with a verdict")
    void getSubmissionById_WithVerdict_Success() {
      // Arrange
      sampleSubmission.setVerdict(Verdict.ACCEPTED);
      sampleSubmission.setExecutionTime(150L);
      sampleSubmission.setMemoryUsed(2048L);
      sampleSubmission.setSafeMessage("All tests passed");

      when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(sampleSubmission));

      // Act
      SubmissionResponse response = submissionService.getSubmissionById(submissionId);

      // Assert
      assertNotNull(response);
      assertEquals(submissionId, response.id());
      assertEquals(42L, response.taskId());
      assertEquals("COMPLETED", response.status());
      assertEquals("ACCEPTED", response.verdict());
      assertEquals(150L, response.executionTime());
      assertEquals(2048L, response.memoryUsed());
      assertEquals("All tests passed", response.safeMessage());
    }

    @Test
    @DisplayName("Should return response with null verdict when submission is still QUEUED")
    void getSubmissionById_QueuedWithoutVerdict_Success() {
      // Arrange
      sampleSubmission.setStatus(SubmissionStatus.QUEUED);
      sampleSubmission.setVerdict(null); // Пока нет вердикта
      sampleSubmission.setExecutionTime(null);
      sampleSubmission.setMemoryUsed(null);

      when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(sampleSubmission));

      // Act
      SubmissionResponse response = submissionService.getSubmissionById(submissionId);

      // Assert
      assertNotNull(response);
      assertEquals("QUEUED", response.status());
      assertNull(response.verdict());
      assertNull(response.executionTime());
      assertNull(response.memoryUsed());
    }

    @Test
    @DisplayName("Should throw RuntimeException when submission not found by UUID")
    void getSubmissionById_NotFound_ShouldThrow() {
      // Arrange
      UUID wrongId = UUID.randomUUID();
      when(submissionRepository.findById(wrongId)).thenReturn(Optional.empty());

      // Act & Assert
      RuntimeException exception = assertThrows(RuntimeException.class,
          () -> submissionService.getSubmissionById(wrongId));

      assertEquals("Submission not found with id: " + wrongId, exception.getMessage());
    }
  }
}
