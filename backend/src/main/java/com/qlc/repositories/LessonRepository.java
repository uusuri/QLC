package com.qlc.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.stereotype.Repository;

import com.qlc.models.entities.Lesson;

import java.util.List;

@Repository
public interface LessonRepository extends JpaRepository<Lesson, Long> {
  List<Lesson> findByModuleIdOrderByPositionAsc(Long moduleId);
}
