package com.qlc.api.services;

import com.qlc.api.exceptions.ResourceNotFoundException;
import com.qlc.api.models.dtos.CourseLanguageDTO;
import com.qlc.shared.model.entities.*;
import com.qlc.api.repositories.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class CourseLanguageService {
  public static final Set<String> CONFIGURABLE_LANGUAGES = Set.of("CPP23", "JAVA21", "PYTHON312", "PYPY312", "JAVASCRIPT_ES2022", "TYPESCRIPT5", "CSHARP_12", "C17", "GO120", "PHP81", "RUST2021");
  private final CourseRepository courses;
  private final UserCourseRepository memberships;
  private final UserRepository users;

  public CourseLanguageService(CourseRepository courses, UserCourseRepository memberships, UserRepository users) {
    this.courses = courses;
    this.memberships = memberships;
    this.users = users;
  }

  public CourseLanguageDTO get(Long courseId, Long userId) {
    Course course = requireAvailableCourse(courseId, userId);
    String selected = memberships.findById(new UserCourseId(userId, courseId))
        .map(UserCourse::getSelectedLanguage).orElse(null);
    return settings(course, selected);
  }

  @Transactional
  public CourseLanguageDTO select(Long courseId, Long userId, String language) {
    // Serializes simultaneous first selections, including enrollment in a free course.
    users.findByIdForLanguageUpdate(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    Course course = requireAvailableCourse(courseId, userId);
    if (!course.isMultilingual()) throw new IllegalArgumentException("This course has a fixed language");
    if (language == null || !course.getAvailableLanguages().contains(language)) {
      throw new IllegalArgumentException("This language is not available in the course");
    }
    UserCourse membership = memberships.findById(new UserCourseId(userId, courseId)).orElseGet(() -> {
      UserCourse created = new UserCourse();
      created.setUserId(userId);
      created.setCourseId(courseId);
      return created;
    });
    membership.setSelectedLanguage(language);
    memberships.save(membership);
    return settings(course, language);
  }

  private Course requireAvailableCourse(Long courseId, Long userId) {
    Course course = courses.findByIdAndPublishedTrue(courseId)
        .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
    boolean free = (course.getPrice() == null || course.getPrice().compareTo(BigDecimal.ZERO) == 0)
        && (course.getPriceInStars() == null || course.getPriceInStars().compareTo(BigDecimal.ZERO) == 0);
    if (!free && !courses.existsByIdAndStudents_Id(courseId, userId)) {
      throw new AccessDeniedException("Course access required");
    }
    return course;
  }

  private CourseLanguageDTO settings(Course course, String selected) {
    List<String> available = course.getAvailableLanguages().stream().sorted().toList();
    return new CourseLanguageDTO(course.isMultilingual(), available,
        course.isMultilingual() ? (available.contains(selected) ? selected : null)
            : available.stream().findFirst().orElse(null));
  }
}
