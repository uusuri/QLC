package com.qlc.controllers;

import com.qlc.models.requests.SubmissionRequest;
import com.qlc.models.responses.SubmissionCreatedResponse;
import com.qlc.models.responses.SubmissionResponse;
import com.qlc.services.SubmissionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class SubmissionController {

  private final SubmissionService submissionService;

  public SubmissionController(SubmissionService submissionService) {
    this.submissionService = submissionService;
  }

  // POST /api/v1/tasks/{taskId}/submissions
  @PostMapping("/tasks/{taskId}/submissions")
  public ResponseEntity<SubmissionCreatedResponse> createSubmission(
      @PathVariable Long taskId,
      @Valid @RequestBody SubmissionRequest request) {

    SubmissionCreatedResponse response = submissionService.createSubmission(taskId, request);

    // Возвращаем статус 202 Accepted вместо привычного 201 Created
    return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
  }

  // GET /api/v1/submissions/{id}
  @GetMapping("/submissions/{id}")
  public ResponseEntity<SubmissionResponse> getSubmissionById(@PathVariable UUID id) {
    SubmissionResponse response = submissionService.getSubmissionById(id);
    return ResponseEntity.ok(response);
  }
}
