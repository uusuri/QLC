package com.qlc.controllers;

import com.qlc.models.requests.SubmissionRequest;
import com.qlc.models.responses.SubmissionCreatedResponse;
import com.qlc.models.responses.SubmissionResponse;
import com.qlc.security.UserDetailsImpl;
import com.qlc.services.SubmissionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api")
public class SubmissionController {

  private final SubmissionService submissionService;
  private final com.qlc.services.InstantAnswerService instantAnswers;

  public SubmissionController(SubmissionService submissionService, com.qlc.services.InstantAnswerService instantAnswers) {
    this.instantAnswers = instantAnswers;
    this.submissionService = submissionService;
  }

  @PostMapping("/tasks/{taskId}/submissions")
  public ResponseEntity<SubmissionCreatedResponse> createSubmission(
      @PathVariable Long taskId,
      @Valid @RequestBody SubmissionRequest request,
      @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
      @AuthenticationPrincipal UserDetailsImpl principal) {

    SubmissionCreatedResponse response = submissionService.createSubmission(
        taskId, request, idempotencyKey, principal.getId());

    return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
  }

  @PostMapping("/tasks/{taskId}/answers")
  public ResponseEntity<SubmissionResponse> submitAnswer(
      @PathVariable Long taskId,
      @Valid @RequestBody com.qlc.models.requests.AnswerRequest request,
      @AuthenticationPrincipal UserDetailsImpl principal) {
    return ResponseEntity.status(HttpStatus.CREATED).body(instantAnswers.submit(taskId, request, principal.getId()));
  }

  @GetMapping("/submissions/{id}")
  public ResponseEntity<SubmissionResponse> getSubmissionById(@PathVariable UUID id,
      @AuthenticationPrincipal UserDetailsImpl principal) {
    SubmissionResponse response = submissionService.getSubmissionById(
        id, principal.getId(), "ROLE_ADMIN".equals(principal.getRole()));
    return ResponseEntity.ok(response);
  }
}
