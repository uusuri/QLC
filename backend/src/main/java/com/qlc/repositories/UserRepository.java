package com.qlc.repositories;

import com.qlc.models.entities.User;
import com.qlc.models.entities.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
  @Query("select task from User u join u.lastLearningTask task "
      + "join fetch task.lesson lesson join fetch lesson.module module "
      + "join fetch module.course where u.id = :userId")
  Optional<Task> findLastLearningTask(@Param("userId") Long userId);

  @Modifying
  @Query("update User u set u.lastLearningTask = :task where u.id = :userId")
  int updateLastLearningTask(@Param("userId") Long userId, @Param("task") Task task);

  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @Query("select u from User u where u.id = :id")
  Optional<User> findByIdForLanguageUpdate(@Param("id") Long id);

  Optional<User> findByUsername(String username);

  Optional<User> findByEmailIgnoreCase(String email);

  Optional<User> findByTgId(Long tgId);

  boolean existsByUsername(String username);

  boolean existsByEmail(String email);

  boolean existsByEmailIgnoreCase(String email);
}
