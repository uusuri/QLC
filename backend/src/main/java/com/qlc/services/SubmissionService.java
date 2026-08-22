package com.qlc.services;

import com.qlc.models.requests.SubmissionRequest;
import com.qlc.models.responses.SubmissionCreatedResponse;
import com.qlc.models.responses.SubmissionResponse;
import com.qlc.models.entities.CodeTask;
import com.qlc.models.entities.Submission;
import com.qlc.models.entities.Task;
import com.qlc.models.entities.User;
import com.qlc.models.enums.SubmissionStatus;
import com.qlc.repositories.SubmissionRepository;
import com.qlc.repositories.TaskRepository;
import com.qlc.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Service
@Transactional
public class SubmissionService {

  private final RedisQueueService redisQueueService;
  private final SubmissionRepository submissionRepository;
  private final TaskRepository taskRepository;
  private final UserRepository userRepository;

  @Value("${app.submissions.max-size:65535}")
  private int maxSourceSize;

  @Value("${app.submissions.max-log-length:10000}")
  private int maxLogLength;

  public SubmissionService(SubmissionRepository submissionRepository, TaskRepository taskRepository,
      RedisQueueService redisQueueService, UserRepository userRepository) {
    this.submissionRepository = submissionRepository;
    this.taskRepository = taskRepository;
    this.redisQueueService = redisQueueService;
    this.userRepository = userRepository;
  }

  public SubmissionCreatedResponse createSubmission(Long taskId, SubmissionRequest request, String idempotencyKey) {
    return createSubmission(taskId, request, idempotencyKey, null);
  }

  public SubmissionCreatedResponse createSubmission(Long taskId, SubmissionRequest request,
      String idempotencyKey, Long userId) {
    // 1. Проверяем ключ идемпотентности. Если запрос дублируется,
    // завершаем метод мгновенно, экономя CPU и коннекты к БД.
    if (idempotencyKey != null && !idempotencyKey.isBlank()) {
      Optional<Submission> existing = userId == null
          ? submissionRepository.findByIdempotencyKey(idempotencyKey)
          : submissionRepository.findByIdempotencyKeyAndUserId(idempotencyKey, userId);
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

    if (request.language() == null || !isSupportedLanguage(request.language())) {
      throw new IllegalArgumentException("Unsupported language: " + request.language());
    }

    // 3. Проверяем, существует ли целевая таска
    Task task = taskRepository.findById(taskId)
        .orElseThrow(() -> new RuntimeException("Task not found with id: " + taskId));

    if (!(task instanceof CodeTask)) {
      throw new IllegalArgumentException("Source-code submissions are only supported for CODE tasks");
    }

    CodeTask codeTask = (CodeTask) task;
    String taskLanguage = codeTask.getLanguage() == null || codeTask.getLanguage().isBlank()
        ? "CPP23"
        : codeTask.getLanguage();
    if (!taskLanguage.equalsIgnoreCase(request.language())) {
      throw new IllegalArgumentException("This task accepts " + taskLanguage + ", not " + request.language());
    }

    // 4. Инициализируем новую сущность в очереди
    Submission submission = new Submission();
    submission.setTask(task);
    submission.setLanguage(request.language());
    submission.setSourceCode(request.sourceCode());
    submission.setStatus(SubmissionStatus.QUEUED);
    submission.setIdempotencyKey(idempotencyKey);
    if (userId != null) {
      User user = userRepository.findById(userId)
          .orElseThrow(() -> new RuntimeException("User not found"));
      submission.setUser(user);
    }

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

  @Scheduled(fixedDelay = 5000)
  public void recoverStuckSubmissions() {
    List<Submission> stuckSubmissions = submissionRepository.findTop50ByStatusAndCreatedAtBeforeOrderByCreatedAtAsc(
        SubmissionStatus.QUEUED, LocalDateTime.now().minusSeconds(10));
    for (Submission s : stuckSubmissions) {
      try {
        redisQueueService.pushToStream(s);
      } catch (Exception e) {
        System.err.println("[Redis] Failed to recover stuck submission: " + e.getMessage());
        return;
      }
    }
  }

  @Transactional(readOnly = true)
  public SubmissionResponse getSubmissionById(UUID id) {
    return getSubmissionById(id, null, true);
  }

  @Transactional(readOnly = true)
  public SubmissionResponse getSubmissionById(UUID id, Long userId, boolean isAdmin) {
    Submission s = submissionRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Submission not found with id: " + id));

    if (!isAdmin && (s.getUser() == null || !Objects.equals(s.getUser().getId(), userId))) {
      throw new org.springframework.security.access.AccessDeniedException("Submission belongs to another user");
    }

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

  private boolean isSupportedLanguage(String language) {
    return "CPP23".equalsIgnoreCase(language) || "JAVA21".equalsIgnoreCase(language);
  }
}
