package com.qlc.controllers;

import com.qlc.models.dtos.CourseDTO;
import com.qlc.models.entities.Course;
import com.qlc.security.UserDetailsImpl;
import com.qlc.services.PurchaseService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/purchase")
@CrossOrigin(origins = "*")
public class PurchaseController {

  private final PurchaseService purchaseService;

  public PurchaseController(PurchaseService purchaseService) {
    this.purchaseService = purchaseService;
  }

  @PostMapping("/checkout")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<List<CourseDTO>> checkout(@AuthenticationPrincipal UserDetailsImpl principal) {
    List<Course> purchased = purchaseService.checkout(principal.getId());
    List<CourseDTO> result = purchased.stream()
        .map(this::mapToCourseDTO)
        .toList();
    return ResponseEntity.ok(result);
  }

  private CourseDTO mapToCourseDTO(Course c) {
    return new CourseDTO(
        c.getId(),
        c.getName(),
        c.getDescription(),
        c.getPrice(),
        c.getPriceInStars());
  }
}
