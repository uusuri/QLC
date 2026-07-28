package com.qlc.controllers;

import com.qlc.models.dtos.CourseDTO;
import com.qlc.models.dtos.MyCourseProgressDTO;
import com.qlc.models.entities.User;
import com.qlc.repositories.UserRepository;
import com.qlc.security.UserDetailsImpl;
import com.qlc.services.LearningProgressService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

  private final UserRepository userRepository;
  private final LearningProgressService learningProgressService;

  public UserController(UserRepository userRepository, LearningProgressService learningProgressService) {
    this.userRepository = userRepository;
    this.learningProgressService = learningProgressService;
  }

  @GetMapping("/me/courses")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<List<CourseDTO>> getMyCourses(@AuthenticationPrincipal UserDetailsImpl principal) {
    User user = userRepository.findById(principal.getId())
        .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));

    List<CourseDTO> courses = user.getBoughtCourses().stream()
        .map(this::mapToCourseDTO)
        .toList();

    return ResponseEntity.ok(courses);
  }

  @GetMapping("/me/learning-courses")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<List<MyCourseProgressDTO>> getMyLearningCourses(
      @AuthenticationPrincipal UserDetailsImpl principal) {
    return ResponseEntity.ok(learningProgressService.getPurchasedCoursesProgress(principal.getId()));
  }

  private CourseDTO mapToCourseDTO(com.qlc.models.entities.Course c) {
    return new CourseDTO(
        c.getId(),
        c.getName(),
        c.getDescription(),
        c.getPrice(),
        c.getPriceInStars());
  }
}
