package com.qlc.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.stereotype.Repository;

import com.qlc.models.entities.Course;

import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
  Optional<Course> findByName(String name);
  List<Course> findAllByPublishedTrue();
  Optional<Course> findByIdAndPublishedTrue(Long id);

  @Query("select course from Course course join course.students student "
      + "where student.id = :userId order by course.id")
  List<Course> findPurchasedByUserId(@Param("userId") Long userId);
}
