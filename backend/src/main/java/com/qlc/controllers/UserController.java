package com.qlc.controllers;

import com.qlc.models.dtos.CourseDTO;
import com.qlc.models.dtos.MyCourseProgressDTO;
import com.qlc.security.UserDetailsImpl;
import com.qlc.services.LearningProgressService;
import com.qlc.services.PurchaseService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

  private final LearningProgressService learningProgressService;
  private final PurchaseService purchaseService;

  public UserController(LearningProgressService learningProgressService, PurchaseService purchaseService) {
    this.learningProgressService = learningProgressService;
    this.purchaseService = purchaseService;
  }

  @GetMapping("/me/courses")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<List<CourseDTO>> getMyCourses(@AuthenticationPrincipal UserDetailsImpl principal) {
    return ResponseEntity.ok(purchaseService.getPurchasedCourses(principal.getId()));
  }

  @GetMapping("/me/learning-courses")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<List<MyCourseProgressDTO>> getMyLearningCourses(
      @AuthenticationPrincipal UserDetailsImpl principal) {
    return ResponseEntity.ok(learningProgressService.getPurchasedCoursesProgress(principal.getId()));
  }

  @PutMapping("/me/learning-position/tasks/{taskId}")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<Map<String, Long>> rememberLearningTask(
      @PathVariable Long taskId, @AuthenticationPrincipal UserDetailsImpl principal) {
    learningProgressService.rememberTask(principal.getId(), taskId);
    return ResponseEntity.ok(Map.of("taskId", taskId));
  }
}
