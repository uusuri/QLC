package com.qlc.api.controllers;

import com.qlc.api.security.UserDetailsImpl;
import com.qlc.shared.model.dtos.ExperienceSummary;
import com.qlc.shared.services.ExperienceService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me/experience")
public class ExperienceController {
  private final ExperienceService experience;

  public ExperienceController(ExperienceService experience) {
    this.experience = experience;
  }

  @GetMapping
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<ExperienceSummary> getMyExperience(@AuthenticationPrincipal UserDetailsImpl principal) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(experience.summary(principal.getId()));
  }
}
