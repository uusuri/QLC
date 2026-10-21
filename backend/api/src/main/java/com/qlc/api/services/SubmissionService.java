package com.qlc.api.services;

import com.qlc.api.exceptions.ResourceNotFoundException;

import com.qlc.api.models.requests.SubmissionRequest;
import com.qlc.api.models.responses.SubmissionCreatedResponse;
import com.qlc.api.models.responses.SubmissionResponse;
import com.qlc.shared.model.dtos.SubmissionResultDTO;
import com.qlc.shared.model.entities.CodeTask;
import com.qlc.shared.model.entities.Submission;
import com.qlc.shared.model.entities.Task;
import com.qlc.shared.model.entities.User;
import com.qlc.shared.model.enums.SubmissionStatus;
import com.qlc.shared.repositories.SubmissionRepository;
import com.qlc.api.repositories.TaskRepository;
import com.qlc.api.repositories.UserRepository;
import com.qlc.shared.language.LanguageProfile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class SubmissionService {

  private static final Logger log = LoggerFactory.getLogger(SubmissionService.class);

  private final RedisQueueService redisQueueService;
  private final SubmissionRepository submissionRepository;
  private final TaskRepository taskRepository;
  private final UserRepository userRepository;
  private final TaskAccessService taskAccess;
  private final CourseLanguageService courseLanguages;

  @Value("${app.submissions.max-size:65535}")
  private int maxSourceSize;

  @Value("${app.submissions.max-log-length:10000}")
  private int maxLogLength;

  public SubmissionService(SubmissionRepository submissionRepository, TaskRepository taskRepository,
      RedisQueueService redisQueueService, UserRepository userRepository, TaskAccessService taskAccess,
      CourseLanguageService courseLanguages) {
    this.taskAccess = taskAccess;
    this.courseLanguages = courseLanguages;
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
    // Базовая валидация входящего payload
    if (request.sourceCode() == null || request.sourceCode().isBlank()) {
      throw new IllegalArgumentException("Source code must not be blank");
    }

    if (request.sourceCode().getBytes(StandardCharsets.UTF_8).length > maxSourceSize) {
      throw new IllegalArgumentException("Source code size exceeds the allowed limit of " + maxSourceSize + " bytes");
    }

    if (request.language() == null || !isSupportedLanguage(request.language())) {
      throw new IllegalArgumentException("Unsupported language: " + request.language());
    }

    // Проверяем тип задачи и её язык
    Task task = taskRepository.findById(taskId)
        .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

    if (!(task instanceof CodeTask)) {
      throw new IllegalArgumentException("Source-code submissions are only supported for CODE tasks");
    }

    CodeTask codeTask = (CodeTask) task;
    String taskLanguage = codeTask.getLanguage() == null || codeTask.getLanguage().isBlank()
        ? "CPP23"
        : codeTask.getLanguage();
    taskAccess.requireAccess(task, userId);
    boolean multilingual = codeTask.getLesson() != null && codeTask.getLesson().getModule() != null
        && codeTask.getLesson().getModule().getCourse().isMultilingual();
    boolean demo = !LanguageProfile.isRunnable(request.language());
    if (multilingual) {
      var settings = courseLanguages.get(codeTask.getLesson().getModule().getCourse().getId(), userId);
      if (settings.selectedLanguage() == null || !settings.selectedLanguage().equals(request.language())) {
        throw new IllegalArgumentException("Select this language in the course before submitting");
      }
    } else if (!taskLanguage.equalsIgnoreCase(request.language())) {
      throw new IllegalArgumentException("This task accepts " + taskLanguage + ", not " + request.language());
    }
    if (demo && !multilingual) {
      throw new IllegalArgumentException("This language is not available for code execution yet");
    }

    // Проверяем повтор запроса только после проверки доступа.
    if (idempotencyKey != null && !idempotencyKey.isBlank()) {
      Optional<Submission> existing = userId == null
          ? submissionRepository.findByIdempotencyKey(idempotencyKey)
          : submissionRepository.findByIdempotencyKeyAndUserId(idempotencyKey, userId);
      if (existing.isPresent()) {
        Submission s = existing.get();
        return new SubmissionCreatedResponse(s.getId(), s.getStatus().name());
      }
    }

    // Инициализируем новую сущность в очереди
    Submission submission = new Submission();
    submission.setTask(task);
    submission.setLanguage(request.language());
    submission.setSourceCode(request.sourceCode());
    submission.setStatus(SubmissionStatus.QUEUED);
    submission.setIdempotencyKey(idempotencyKey);
    if (userId != null) {
      User user = userRepository.findById(userId)
          .orElseThrow(() -> new ResourceNotFoundException("User not found"));
      submission.setUser(user);
    }

    if (demo) {
      submission.setStatus(SubmissionStatus.DEMO);
      submission.setCountsForProgress(false);
      submission.setSafeMessage("Демонстрационная отправка: код не проверялся, задача не засчитана.");
      Submission savedDemo = submissionRepository.save(submission);
      return new SubmissionCreatedResponse(savedDemo.getId(), savedDemo.getStatus().name());
    }
    Submission saved = submissionRepository.save(submission);

    // Best-effort publication after commit; the database recovery scan retries Redis failures.
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
        @Override
        public void afterCommit() {
          try {
            redisQueueService.pushToStream(saved);
          } catch (Exception e) {
            log.warn("Failed to publish submissionId={} after commit; recovery will retry it",
                saved.getId(), e);
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
    return getSubmissionById(id, null, true);
  }

  @Transactional(readOnly = true)
  public SubmissionResponse getSubmissionById(UUID id, Long userId, boolean isAdmin) {
    SubmissionResultDTO submission = submissionRepository.findResultById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Submission not found with id: " + id));

    if (!isAdmin && (submission.userId() == null || !Objects.equals(submission.userId(), userId))) {
      throw new org.springframework.security.access.AccessDeniedException("Submission belongs to another user");
    }

    // Обрезка логов компилятора под лимиты конфигураци сервера
    String safe = submission.safeMessage();
    if (safe != null && safe.length() > maxLogLength) {
      safe = safe.substring(0, maxLogLength) + "\n[truncated]";
    }

    return new SubmissionResponse(
        submission.id(),
        submission.taskId(),
        submission.language(),
        submission.status().name(),
        submission.verdict() != null ? submission.verdict().name() : null,
        submission.executionTime(),
        submission.memoryUsed(),
        safe,
        submission.createdAt());
  }

  private boolean isSupportedLanguage(String language) {
    return CourseLanguageService.CONFIGURABLE_LANGUAGES.contains(language);
  }
}
