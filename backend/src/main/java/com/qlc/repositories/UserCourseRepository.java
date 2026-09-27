package com.qlc.repositories;

import com.qlc.models.entities.UserCourse;
import com.qlc.models.entities.UserCourseId;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserCourseRepository extends JpaRepository<UserCourse, UserCourseId> {
  List<UserCourse> findByUserId(Long userId);
}
