package com.qlc.api.repositories;

import com.qlc.shared.model.entities.CodeTask;
import com.qlc.shared.model.entities.Course;
import com.qlc.shared.model.entities.Lesson;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TaskOrderingIntegrationTest {
  @Autowired EntityManager em;
  @Autowired TaskRepository tasks;

  @Test
  void sortsByDifficultyAndKeepsIdOrderWithinEachDifficultyAndLesson() {
    Course course = new Course();
    course.setName("Task ordering");
    course.setDescription("Test");
    course.setPrice(BigDecimal.ZERO);
    course.setPriceInStars(BigDecimal.ZERO);
    em.persist(course);
    com.qlc.shared.model.entities.Module module = new com.qlc.shared.model.entities.Module();
    module.setCourse(course);
    module.setName("Test");
    module.setDescription("Test");
    em.persist(module);
    Lesson lesson = lesson(module);
    Lesson otherLesson = lesson(module);
    CodeTask hard = task(lesson, 3);
    CodeTask easy = task(lesson, 1);
    CodeTask medium = task(lesson, 2);
    CodeTask anotherHard = task(lesson, 3);
    task(otherLesson, 1);
    em.flush();
    em.clear();

    assertEquals(List.of(easy.getId(), medium.getId(), hard.getId(), anotherHard.getId()),
        tasks.findByLessonId(lesson.getId()).stream().map(t -> t.getId()).toList());
  }

  private Lesson lesson(com.qlc.shared.model.entities.Module module) {
    Lesson lesson = new Lesson();
    lesson.setModule(module);
    lesson.setName("Test");
    lesson.setDescription("Test");
    em.persist(lesson);
    return lesson;
  }

  private CodeTask task(Lesson lesson, int difficulty) {
    CodeTask task = new CodeTask();
    task.setLesson(lesson);
    task.setStatementMd("Task");
    task.setDifficulty((short) difficulty);
    em.persist(task);
    return task;
  }
}
