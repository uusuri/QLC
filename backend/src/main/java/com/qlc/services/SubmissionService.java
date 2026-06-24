package com.qlc.services;

import com.qlc.models.requests.SubmissionRequest;
import com.qlc.models.responses.SubmissionCreatedResponse;
import com.qlc.models.responses.SubmissionResponse;
import com.qlc.models.entities.Submission;
import com.qlc.models.entities.Task;
import com.qlc.models.enums.SubmissionStatus;
import com.qlc.repositories.SubmissionRepository;
import com.qlc.repositories.TaskRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class SubmissionService {

  private final SubmissionRepository submissionRepository;
  private final TaskRepository taskRepository;

  // Вытаскиваем максимальный размер кода из application.yaml (дефолт 65535 байт,
  // если не задано)
  @Value("${app.submissions.max-size:65535}")
  private int maxSourceSize;

  public SubmissionService(SubmissionRepository submissionRepository, TaskRepository taskRepository) {
    this.submissionRepository = submissionRepository;
    this.taskRepository = taskRepository;
  }

  public SubmissionCreatedResponse createSubmission(Long taskId, SubmissionRequest request) {
    // 1. Проверяем, существует ли таска (иначе 404)
    Task task = taskRepository.findById(taskId)
        .orElseThrow(() -> new RuntimeException("Task not found with id: " + taskId));

    // 2. Проверяем ограничение на размер исходного кода (иначе 400 Bad Request)
    if (request.sourceCode().getBytes().length > maxSourceSize) {
      throw new IllegalArgumentException("Source code size exceeds the allowed limit of " + maxSourceSize + " bytes");
    }

    // 3. Создаем сабмишен со статусом QUEUED
    Submission submission = new Submission();
    submission.setTask(task);
    submission.setLanguage(request.language());
    submission.setSourceCode(request.sourceCode());
    submission.setStatus(SubmissionStatus.QUEUED);
    // user пока не привязываем, так как авторизация out of scope

    Submission saved = submissionRepository.save(submission);

    // 4. Возвращаем UUID и статус
    return new SubmissionCreatedResponse(saved.getId(), saved.getStatus().name());
  }

  @Transactional(readOnly = true)
  public SubmissionResponse getSubmissionById(UUID id) {
    Submission s = submissionRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Submission not found with id: " + id));

    return new SubmissionResponse(
        s.getId(),
        s.getTask().getId(),
        s.getLanguage(),
        s.getStatus().name(),
        s.getVerdict() != null ? s.getVerdict().name() : null,
        s.getExecutionTime(),
        s.getMemoryUsed(),
        s.getSafeMessage(),
        s.getCreatedAt());
  }
}
