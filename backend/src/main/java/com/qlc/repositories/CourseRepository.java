package com.qlc.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.stereotype.Repository;

import com.qlc.models.entities.Course;

import java.util.Optional;
import java.util.List;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
  Optional<Course> findByName(String name);
  List<Course> findAllByPublishedTrue();
  Optional<Course> findByIdAndPublishedTrue(Long id);
}
