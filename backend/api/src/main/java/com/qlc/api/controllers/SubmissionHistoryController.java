package com.qlc.api.controllers;

import com.qlc.api.models.dtos.SubmissionHistoryDetail;
import com.qlc.api.models.dtos.SubmissionHistoryPage;
import com.qlc.api.security.UserDetailsImpl;
import com.qlc.api.services.SubmissionHistoryService;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tasks/{taskId}/submissions")
@PreAuthorize("isAuthenticated()")
public class SubmissionHistoryController {
  private final SubmissionHistoryService history;

  public SubmissionHistoryController(SubmissionHistoryService history) { this.history = history; }

  @GetMapping
  public ResponseEntity<SubmissionHistoryPage> list(@PathVariable Long taskId,
      @RequestParam(defaultValue = "0") int page, @AuthenticationPrincipal UserDetailsImpl principal) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(history.list(taskId, principal.getId(), page));
  }

  @GetMapping("/{id}")
  public ResponseEntity<SubmissionHistoryDetail> detail(@PathVariable Long taskId, @PathVariable UUID id,
      @AuthenticationPrincipal UserDetailsImpl principal) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(history.detail(taskId, principal.getId(), id));
  }
}
