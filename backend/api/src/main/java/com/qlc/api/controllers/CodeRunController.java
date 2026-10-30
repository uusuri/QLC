package com.qlc.api.controllers;

import com.qlc.api.models.requests.CodeRunRequest;
import com.qlc.api.security.UserDetailsImpl;
import com.qlc.api.services.CodeRunService;
import com.qlc.shared.runs.CodeRunResult;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@PreAuthorize("isAuthenticated()")
public class CodeRunController {
  private final CodeRunService runs;
  public CodeRunController(CodeRunService runs) { this.runs = runs; }

  @PostMapping("/tasks/{taskId}/runs")
  public ResponseEntity<CodeRunResult> create(@PathVariable Long taskId,
      @Valid @RequestBody CodeRunRequest request, @AuthenticationPrincipal UserDetailsImpl user) {
    return ResponseEntity.accepted().header("Cache-Control", "private, no-store")
        .body(runs.create(taskId, user.getId(), request));
  }

  @GetMapping("/runs/{id}")
  public ResponseEntity<CodeRunResult> get(@PathVariable UUID id, @AuthenticationPrincipal UserDetailsImpl user) {
    return ResponseEntity.ok().header("Cache-Control", "private, no-store").body(runs.get(id, user.getId()));
  }
}
