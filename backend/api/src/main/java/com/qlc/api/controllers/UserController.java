package com.qlc.api.controllers;

import com.qlc.api.models.dtos.CourseDTO;
import com.qlc.api.models.dtos.MyCourseProgressDTO;
import com.qlc.api.security.UserDetailsImpl;
import com.qlc.api.services.LearningProgressService;
import com.qlc.api.services.PurchaseService;
import com.qlc.api.services.UserPersonalizationService;
import com.qlc.shared.model.entities.Personalization;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

  private final LearningProgressService learningProgressService;
  private final PurchaseService purchaseService;
  private final UserPersonalizationService userAvatarService;

  public UserController(LearningProgressService learningProgressService, PurchaseService purchaseService,
      UserPersonalizationService userAvatarService) {
    this.learningProgressService = learningProgressService;
    this.purchaseService = purchaseService;
    this.userAvatarService = userAvatarService;
  }

  @GetMapping("/me/avatar")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<byte[]> getMyAvatar(@AuthenticationPrincipal UserDetailsImpl principal) {
    Personalization avatar = userAvatarService.findAvatarByUserId(principal.getId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Аватарка не загружена"));
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(avatar.getContentType()))
        .cacheControl(CacheControl.noStore())
        .header("X-Content-Type-Options", "nosniff")
        .body(avatar.getContentData());
  }

  @PutMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<Void> uploadMyAvatar(@AuthenticationPrincipal UserDetailsImpl principal,
      @RequestParam("file") MultipartFile file) {
    userAvatarService.save(principal.getId(), file);
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/me/avatar")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<Void> deleteMyAvatar(@AuthenticationPrincipal UserDetailsImpl principal) {
    userAvatarService.deleteAvatar(principal.getId());
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/me/avatar-frame")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<byte[]> getMyAvatarFrame(@AuthenticationPrincipal  UserDetailsImpl principal) {
    return new ResponseEntity<>(null);
  }

  @DeleteMapping("/me/avatar-frame")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<Void> deleteMyAvatarFrame(@AuthenticationPrincipal UserDetailsImpl principal) {
    userAvatarService.deleteAvatarFrame(principal.getId());
    return ResponseEntity.noContent().build();
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
