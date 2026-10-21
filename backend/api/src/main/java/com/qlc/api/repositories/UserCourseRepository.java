package com.qlc.api.repositories;

import com.qlc.shared.model.entities.UserCourse;
import com.qlc.shared.model.entities.UserCourseId;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserCourseRepository extends JpaRepository<UserCourse, UserCourseId> {
  List<UserCourse> findByUserId(Long userId);
}
