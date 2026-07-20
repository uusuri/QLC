package com.qlc.services;

import com.qlc.models.entities.Course;
import com.qlc.models.entities.User;
import com.qlc.repositories.CourseRepository;
import com.qlc.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class PurchaseService {

  private final CartService cartService;
  private final UserRepository userRepository;
  private final CourseRepository courseRepository;

  public PurchaseService(CartService cartService,
      UserRepository userRepository,
      CourseRepository courseRepository) {
    this.cartService = cartService;
    this.userRepository = userRepository;
    this.courseRepository = courseRepository;
  }

  @Transactional
  public List<Course> checkout(Long userId) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new RuntimeException("User not found"));

    Set<Long> courseIds = cartService.getCourseIds(userId);
    if (courseIds.isEmpty()) {
      throw new RuntimeException("Cart is empty");
    }

    List<Course> courses = courseRepository.findAllById(courseIds);
    if (courses.isEmpty()) {
      throw new RuntimeException("No courses found in cart");
    }

    for (Course course : courses) {
      user.getBoughtCourses().add(course);
      course.getStudents().add(user);
    }

    userRepository.save(user);
    cartService.clear(userId);

    return courses;
  }

  @Transactional(readOnly = true)
  public boolean hasAccess(Long userId, Long courseId) {
    User user = userRepository.findById(userId).orElse(null);
    if (user == null) {
      return false;
    }
    return user.getBoughtCourses().stream()
        .anyMatch(course -> course.getId() == courseId);
  }
}
