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

  public SubmissionController(SubmissionService submissionService) {
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

  @GetMapping("/submissions/{id}")
  public ResponseEntity<SubmissionResponse> getSubmissionById(@PathVariable UUID id,
      @AuthenticationPrincipal UserDetailsImpl principal) {
    SubmissionResponse response = submissionService.getSubmissionById(
        id, principal.getId(), "ROLE_ADMIN".equals(principal.getRole()));
    return ResponseEntity.ok(response);
  }
}
