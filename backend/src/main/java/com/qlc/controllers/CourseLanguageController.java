package com.qlc.controllers;

import com.qlc.models.dtos.CourseLanguageDTO;
import com.qlc.models.requests.CourseLanguageRequest;
import com.qlc.security.UserDetailsImpl;
import com.qlc.services.CourseLanguageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/courses/{courseId}/language")
@PreAuthorize("isAuthenticated()")
public class CourseLanguageController {
  private final CourseLanguageService languages;
  public CourseLanguageController(CourseLanguageService languages) { this.languages = languages; }

  @GetMapping
  public ResponseEntity<CourseLanguageDTO> get(@PathVariable Long courseId,
      @AuthenticationPrincipal UserDetailsImpl principal) {
    return ResponseEntity.ok().header("Cache-Control", "private, no-store")
        .body(languages.get(courseId, principal.getId()));
  }

  @PutMapping
  public ResponseEntity<CourseLanguageDTO> select(@PathVariable Long courseId,
      @AuthenticationPrincipal UserDetailsImpl principal, @Valid @RequestBody CourseLanguageRequest request) {
    return ResponseEntity.ok().header("Cache-Control", "private, no-store")
        .body(languages.select(courseId, principal.getId(), request.selectedLanguage()));
  }
}
