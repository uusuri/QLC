package com.qlc.services;

import com.qlc.models.requests.SubmissionRequest;
import com.qlc.models.responses.SubmissionCreatedResponse;
import com.qlc.models.responses.SubmissionResponse;
import com.qlc.models.entities.CodeTask;
import com.qlc.models.entities.Submission;
import com.qlc.models.entities.Task;
import com.qlc.models.enums.SubmissionStatus;
import com.qlc.repositories.SubmissionRepository;
import com.qlc.repositories.TaskRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class SubmissionService {

  private final RedisQueueService redisQueueService;
  private final SubmissionRepository submissionRepository;
  private final TaskRepository taskRepository;

  @Value("${app.submissions.max-size:65535}")
  private int maxSourceSize;

  @Value("${app.submissions.max-log-length:10000}")
  private int maxLogLength;

  public SubmissionService(SubmissionRepository submissionRepository, TaskRepository taskRepository,
      RedisQueueService redisQueueService) {
    this.submissionRepository = submissionRepository;
    this.taskRepository = taskRepository;
    this.redisQueueService = redisQueueService;
  }

  public SubmissionCreatedResponse createSubmission(Long taskId, SubmissionRequest request, String idempotencyKey) {
    // 1. Проверяем ключ идемпотентности. Если запрос дублируется,
    // завершаем метод мгновенно, экономя CPU и коннекты к БД.
    if (idempotencyKey != null && !idempotencyKey.isBlank()) {
      Optional<Submission> existing = submissionRepository.findByIdempotencyKey(idempotencyKey);
      if (existing.isPresent()) {
        Submission s = existing.get();
        return new SubmissionCreatedResponse(s.getId(), s.getStatus().name());
      }
    }

    // 2. Базовая валидация входящего payload
    if (request.sourceCode() == null || request.sourceCode().isBlank()) {
      throw new IllegalArgumentException("Source code must not be blank");
    }

    if (request.sourceCode().getBytes(StandardCharsets.UTF_8).length > maxSourceSize) {
      throw new IllegalArgumentException("Source code size exceeds the allowed limit of " + maxSourceSize + " bytes");
    }

    if (request.language() == null || !"CPP23".equalsIgnoreCase(request.language())) {
      throw new IllegalArgumentException("Unsupported language: " + request.language());
    }

    // 3. Проверяем, существует ли целевая таска
    Task task = taskRepository.findById(taskId)
        .orElseThrow(() -> new RuntimeException("Task not found with id: " + taskId));

    if (!(task instanceof CodeTask)) {
      throw new IllegalArgumentException("Source-code submissions are only supported for CODE tasks");
    }

    // 4. Инициализируем новую сущность в очереди
    Submission submission = new Submission();
    submission.setTask(task);
    submission.setLanguage(request.language());
    submission.setSourceCode(request.sourceCode());
    submission.setStatus(SubmissionStatus.QUEUED);
    submission.setIdempotencyKey(idempotencyKey);
    // TODO: Привязать юзера из SecurityContext!!!

    Submission saved = submissionRepository.save(submission);

    // 5. Best-effort publish после commit. Это НЕ transactional outbox: если Redis
    // недоступен после фиксации БД, запись останется QUEUED без сообщения до
    // появления отдельного recovery scan/outbox механизма.
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
        @Override
        public void afterCommit() {
          try {
            redisQueueService.pushToStream(saved);
          } catch (Exception e) {
            System.err.println("[Redis] Failed to publish submission after commit: " + e.getMessage());
          }
        }
      });
    } else {
      redisQueueService.pushToStream(saved);
    }

    return new SubmissionCreatedResponse(saved.getId(), saved.getStatus().name());
  }

  @Transactional(readOnly = true)
  public SubmissionResponse getSubmissionById(UUID id) {
    Submission s = submissionRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Submission not found with id: " + id));

    // Обрезка потенциально огромных логов компилятора под лимиты конфигурации
    // сервера
    String safe = s.getSafeMessage();
    if (safe != null && safe.length() > maxLogLength) {
      safe = safe.substring(0, maxLogLength) + "\n[truncated]";
    }

    return new SubmissionResponse(
        s.getId(),
        s.getTask().getId(),
        s.getLanguage(),
        s.getStatus().name(),
        s.getVerdict() != null ? s.getVerdict().name() : null,
        s.getExecutionTime(),
        s.getMemoryUsed(),
        safe,
        s.getCreatedAt());
  }
}
