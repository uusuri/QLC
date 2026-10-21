package com.qlc.api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.stereotype.Repository;

import com.qlc.shared.model.entities.Task;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
  @org.springframework.data.jpa.repository.Query("select t from Task t where t.lesson.id = :lessonId order by t.id")
  List<Task> findByLessonId(Long lessonId);
}
