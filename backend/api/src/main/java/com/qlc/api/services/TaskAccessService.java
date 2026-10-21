package com.qlc.api.services;

import com.qlc.shared.model.entities.Course;
import com.qlc.shared.model.entities.Task;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class TaskAccessService {
  private final PurchaseService purchases;

  public TaskAccessService(PurchaseService purchases) {
    this.purchases = purchases;
  }

  public void requireAccess(Task task, Long userId) {
    if (userId == null || task.getLesson() == null || task.getLesson().getModule() == null) {
      throw new AccessDeniedException("Task is not available for learning");
    }
    // Resolve the lesson and course from the persisted task, never from client-supplied IDs.
    Course course = task.getLesson().getModule().getCourse();
    if (course == null || !course.isPublished() || !task.getLesson().isPublished()
        || (!(isZero(course.getPrice()) && isZero(course.getPriceInStars()))
            && !purchases.hasAccess(userId, course.getId()))) {
      throw new AccessDeniedException("Task is not available for learning");
    }
  }

  private boolean isZero(BigDecimal value) {
    return value == null || value.compareTo(BigDecimal.ZERO) == 0;
  }
}
