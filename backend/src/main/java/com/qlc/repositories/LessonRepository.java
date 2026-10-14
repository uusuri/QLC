package com.qlc.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.stereotype.Repository;

import com.qlc.models.entities.Lesson;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface LessonRepository extends JpaRepository<Lesson, Long> {
  List<Lesson> findByModuleIdOrderByPositionAsc(Long moduleId);

  @Query("select lesson from Lesson lesson "
      + "where lesson.module.course.id = :courseId "
      + "order by lesson.module.position, lesson.position, lesson.id")
  List<Lesson> findByCourseIdOrdered(@Param("courseId") Long courseId);

  @Query("select lesson from Lesson lesson "
      + "join fetch lesson.module module "
      + "join fetch module.course "
      + "where lesson.id = :lessonId")
  Optional<Lesson> findByIdWithModuleAndCourse(@Param("lessonId") Long lessonId);
}
