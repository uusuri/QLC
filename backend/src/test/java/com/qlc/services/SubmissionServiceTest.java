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
import org.mockito.ArgumentCaptor;
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
@DisplayName("Submission Service Production Test Suite")
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
  private final int MAX_LOG_LENGTH_FOR_TEST = 50;

  @BeforeEach
  void setUp() {
    // Жестко привязываем конфигурационные лимиты сервера для предсказуемости тестов
    ReflectionTestUtils.setField(submissionService, "maxSourceSize", MAX_SIZE_FOR_TEST);
    ReflectionTestUtils.setField(submissionService, "maxLogLength", MAX_LOG_LENGTH_FOR_TEST);

    sampleTask = new CodeTask();
    sampleTask.setId(42L);
    sampleTask.setStatementMd("Implement bubble sort");
  }

  @Nested
  @DisplayName("1. Submission Creation Pipeline (POST)")
  class CreateSubmissionTests {

    @Test
    @DisplayName("SUCCESS: Should create QUEUED submission, record timestamps, and push to Redis Stream")
    void createSubmission_Success() {
      // Arrange
      Long taskId = 42L;
      String idempotencyKey = "idemp-key-v1-12345";
      SubmissionRequest request = new SubmissionRequest("CPP23", "#include <iostream>\nint main() {}");
      UUID generatedId = UUID.randomUUID();

      when(taskRepository.findById(taskId)).thenReturn(Optional.of(sampleTask));
      when(submissionRepository.save(any(Submission.class))).thenAnswer(invocation -> {
        Submission s = invocation.getArgument(0);
        s.setId(generatedId);
        s.setCreatedAt(LocalDateTime.now());
        return s;
      });

      // Act
      SubmissionCreatedResponse response = submissionService.createSubmission(taskId, request, idempotencyKey);

      // Assert
      assertNotNull(response);
      assertEquals(generatedId, response.id());
      assertEquals("QUEUED", response.status());

      // Каптурим сущность, которая ушла в базу данных
      ArgumentCaptor<Submission> submissionCaptor = ArgumentCaptor.forClass(Submission.class);
      verify(submissionRepository, times(1)).save(submissionCaptor.capture());

      Submission dbEntity = submissionCaptor.getValue();
      assertEquals("CPP23", dbEntity.getLanguage());
      assertEquals("#include <iostream>\nint main() {}", dbEntity.getSourceCode());
      assertEquals(SubmissionStatus.QUEUED, dbEntity.getStatus());
      assertEquals(idempotencyKey, dbEntity.getIdempotencyKey());
      assertNull(dbEntity.getVerdict(), "Новый сабмишен не должен иметь вердикта до проверки воркером");

      // Проверяем, что брокер очередей получил именно ту сущность, что закоммитилась
      verify(redisQueueService, times(1)).pushToStream(dbEntity);
    }

    @Test
    @DisplayName("IDEMPOTENCY HIT: Should return existing submission instantly without calling DB save or Redis")
    void createSubmission_IdempotencyHit_ReturnsExisting() {
      // Arrange
      Long taskId = 42L;
      String duplicateKey = "same-request-token";
      SubmissionRequest request = new SubmissionRequest("CPP23", "some code");
      UUID existingId = UUID.randomUUID();

      Submission mockExistingSubmission = new Submission();
      mockExistingSubmission.setId(existingId);
      mockExistingSubmission.setStatus(SubmissionStatus.RUNNING); // Задача уже обрабатывается

      when(submissionRepository.findByIdempotencyKey(duplicateKey)).thenReturn(Optional.of(mockExistingSubmission));

      // Act
      SubmissionCreatedResponse response = submissionService.createSubmission(taskId, request, duplicateKey);

      // Assert
      assertNotNull(response);
      assertEquals(existingId, response.id());
      assertEquals("RUNNING", response.status());

      // Гарантируем, что инфраструктура не выполняла лишней работы
      verify(taskRepository, never()).findById(any());
      verify(submissionRepository, never()).save(any());
      verify(redisQueueService, never()).pushToStream(any());
    }

    @Test
    @DisplayName("VALIDATION ERROR: Should throw RuntimeException when taskId is missing (404 context)")
    void createSubmission_TaskNotFound_ThrowsException() {
      // Arrange
      Long invalidTaskId = 999L;
      SubmissionRequest request = new SubmissionRequest("CPP23", "void main() {}");
      when(taskRepository.findById(invalidTaskId)).thenReturn(Optional.empty());

      // Act & Assert
      RuntimeException ex = assertThrows(RuntimeException.class,
          () -> submissionService.createSubmission(invalidTaskId, request, null));

      assertEquals("Task not found with id: " + invalidTaskId, ex.getMessage());
      verify(submissionRepository, never()).save(any());
      verify(redisQueueService, never()).pushToStream(any());
    }

    @Test
    @DisplayName("VALIDATION ERROR: Should throw IllegalArgumentException when source code is too massive (400 context)")
    void createSubmission_PayloadTooLarge_ThrowsException() {
      // Arrange
      Long taskId = 42L;
      String oversizedCode = "A".repeat(MAX_SIZE_FOR_TEST + 1); // 101 байт при лимите 100
      SubmissionRequest request = new SubmissionRequest("CPP23", oversizedCode);

      // ФИКС: Убрали стаб findById, так как метод падает раньше на валидации размера
      // ода

      // Act & Assert
      IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
          () -> submissionService.createSubmission(taskId, request, null));

      assertTrue(ex.getMessage().contains("Source code size exceeds the allowed limit"));
      verify(submissionRepository, never()).save(any());
    }

    @Test
    @DisplayName("VALIDATION ERROR: Should throw IllegalArgumentException for unsupported language compiler")
    void createSubmission_UnsupportedLanguage_ThrowsException() {
      // Arrange
      Long taskId = 42L;
      SubmissionRequest request = new SubmissionRequest("PYTHON3", "print('hello')");

      // Act & Assert
      IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
          () -> submissionService.createSubmission(taskId, request, null));

      assertTrue(ex.getMessage().contains("Unsupported language"));
      verify(submissionRepository, never()).save(any());
    }
  }

  @Nested
  @DisplayName("2. Submission Retrieval Pipeline (GET)")
  class GetSubmissionTests {

    private UUID submissionId;
    private Submission baseSubmission;

    @BeforeEach
    void setUpSubmissionData() {
      submissionId = UUID.randomUUID();
      baseSubmission = new Submission();
      baseSubmission.setId(submissionId);
      baseSubmission.setTask(sampleTask);
      baseSubmission.setLanguage("CPP23");
      baseSubmission.setSourceCode("int main() { return 0; }");
      baseSubmission.setCreatedAt(LocalDateTime.now().minusMinutes(5));
    }

    @Test
    @DisplayName("SUCCESS: Should read active FINISHED state with standard AC verdict and metrics")
    void getSubmissionById_FinishedWithVerdict_Success() {
      // Arrange
      baseSubmission.setStatus(SubmissionStatus.FINISHED);
      baseSubmission.setVerdict(Verdict.AC); // Accepted из TZ
      baseSubmission.setExecutionTime(45L); // 45 ms
      baseSubmission.setMemoryUsed(1024L); // 1024 KB
      baseSubmission.setSafeMessage("All test cases completed successfully.");

      when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(baseSubmission));

      // Act
      SubmissionResponse response = submissionService.getSubmissionById(submissionId);

      // Assert
      assertNotNull(response);
      assertEquals(submissionId, response.id());
      assertEquals("FINISHED", response.status());
      assertEquals("AC", response.verdict());
      assertEquals(45L, response.executionTime());
      assertEquals(1024L, response.memoryUsed());
      assertEquals("All test cases completed successfully.", response.safeMessage());
      assertNotNull(response.createdAt());
    }

    @Test
    @DisplayName("SUCCESS: Should handle intermediate COMPILING state where verdict and metrics are still null")
    void getSubmissionById_InProcessing_ReturnsNullVerdictAndMetrics() {
      // Arrange
      baseSubmission.setStatus(SubmissionStatus.COMPILING);
      baseSubmission.setVerdict(null);
      baseSubmission.setExecutionTime(null);
      baseSubmission.setMemoryUsed(null);

      when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(baseSubmission));

      // Act
      SubmissionResponse response = submissionService.getSubmissionById(submissionId);

      // Assert
      assertNotNull(response);
      assertEquals("COMPILING", response.status());
      assertNull(response.verdict());
      assertNull(response.executionTime());
      assertNull(response.memoryUsed());
    }

    @Test
    @DisplayName("CRITICAL LOGIC: Should truncate compile_log/safe_message if it violates server size limits")
    void getSubmissionById_OversizedLog_TruncatesLogWithWarning() {
      // Arrange
      baseSubmission.setStatus(SubmissionStatus.FINISHED);
      baseSubmission.setVerdict(Verdict.CE); // Compilation Error

      // Генерируем лог компилятора в 60 символов при серверном лимите в 50 символов
      String hugeCompilerLog = "Internal compiler error: layout mismatch in struct initialization context.";
      baseSubmission.setSafeMessage(hugeCompilerLog);

      when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(baseSubmission));

      // Act
      SubmissionResponse response = submissionService.getSubmissionById(submissionId);

      // Assert
      assertNotNull(response);
      String safeMessage = response.safeMessage();

      assertNotNull(safeMessage);
      assertTrue(safeMessage.endsWith("\n[truncated]"), "Лог должен завершаться техническим маркером обрезки");
      // Проверяем, что базовая часть обрезки строго равна лимиту в 50 символов
      String originalPart = safeMessage.split("\n")[0];
      assertEquals(MAX_LOG_LENGTH_FOR_TEST, originalPart.length());
    }

    @Test
    @DisplayName("ERROR: Should throw RuntimeException when checking non-existent UUID (404 context)")
    void getSubmissionById_NotFound_ThrowsException() {
      // Arrange
      UUID fakeId = UUID.randomUUID();
      when(submissionRepository.findById(fakeId)).thenReturn(Optional.empty());

      // Act & Assert
      RuntimeException ex = assertThrows(RuntimeException.class,
          () -> submissionService.getSubmissionById(fakeId));

      assertEquals("Submission not found with id: " + fakeId, ex.getMessage());
    }
  }
}
