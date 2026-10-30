package com.qlc.api.services;

import com.qlc.api.exceptions.ResourceNotFoundException;
import com.qlc.api.models.dtos.SubmissionHistoryDetail;
import com.qlc.api.models.dtos.SubmissionHistoryPage;
import com.qlc.api.repositories.SubmissionHistoryRepository;
import com.qlc.api.repositories.TaskRepository;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class SubmissionHistoryService {
  private final SubmissionHistoryRepository history;
  private final TaskRepository tasks;
  private final TaskAccessService access;

  public SubmissionHistoryService(SubmissionHistoryRepository history, TaskRepository tasks, TaskAccessService access) {
    this.history = history;
    this.tasks = tasks;
    this.access = access;
  }

  public SubmissionHistoryPage list(Long taskId, Long userId, int page) {
    if (page < 0 || page > 10000) throw new IllegalArgumentException("History page must be between 0 and 10000");
    requireAccess(taskId, userId);
    var slice = history.findHistory(userId, taskId, PageRequest.of(page, 20));
    return new SubmissionHistoryPage(slice.getContent(), page, slice.hasNext());
  }

  public SubmissionHistoryDetail detail(Long taskId, Long userId, UUID id) {
    requireAccess(taskId, userId);
    return history.findOwnDetail(userId, taskId, id)
        .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));
  }

  private void requireAccess(Long taskId, Long userId) {
    var task = tasks.findById(taskId).orElseThrow(() -> new ResourceNotFoundException("Task not found"));
    access.requireAccess(task, userId);
  }
}
