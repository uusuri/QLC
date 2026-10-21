package com.qlc.api.controllers;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Includes the parent's committed, non-transactional CRUD/serialization checks. */
class TaskHintsIntegrationTest extends TestTaskCrudIntegrationTest {
  @Test
  void hintsSurviveReloadAndLegacyUpdateAndCanBeCleared() throws Exception {
    long id = createTest();
    String body = """
        {"taskType":"TEST","statementMd":"Hints","options":["A","B"],"correctOptionIndexes":[1],
         "hints":["Идея","**Наблюдение**","План\\nВторая строка"]}
        """;
    mvc.perform(put("/api/tasks/{id}", id).with(user(admin)).contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isOk());
    mvc.perform(get("/api/tasks/{id}", id).with(user(admin)))
        .andExpect(status().isOk()).andExpect(jsonPath("hints[2]").value("План\nВторая строка"));
    mvc.perform(get("/api/lessons/{id}/learn", lessonId).with(user(learner)))
        .andExpect(status().isOk()).andExpect(jsonPath("tasks[0].hints[1]").value("**Наблюдение**"))
        .andExpect(jsonPath("tasks[0].correctOptionIndexes").doesNotExist());
    mvc.perform(put("/api/tasks/{id}", id).with(user(admin)).contentType(MediaType.APPLICATION_JSON)
        .content("{\"taskType\":\"TEST\",\"statementMd\":\"Legacy\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("hints.length()").value(3));
    mvc.perform(put("/api/tasks/{id}", id).with(user(admin)).contentType(MediaType.APPLICATION_JSON)
        .content("{\"taskType\":\"TEST\",\"statementMd\":\"Clear\",\"hints\":[]}"))
        .andExpect(status().isOk());
    mvc.perform(get("/api/tasks/{id}", id).with(user(admin)))
        .andExpect(status().isOk()).andExpect(jsonPath("hints.length()").value(0));
  }

  @Test
  void supportsCodeAndNumericAndRejectsMalformedHints() throws Exception {
    for (String type : new String[]{"CODE", "NUMERIC"}) {
      mvc.perform(post("/api/lessons/{id}/tasks", lessonId).with(user(admin)).contentType(MediaType.APPLICATION_JSON)
          .content("{\"taskType\":\""+type+"\",\"statementMd\":\"Task\",\"hints\":[\"1\",\"2\",\"3\"]}"))
          .andExpect(status().isOk()).andExpect(jsonPath("hints.length()").value(3));
    }
    for (String hints : new String[]{"[\" \"]", "[null]", "[\"1\",\"2\",\"3\",\"4\",\"5\",\"6\"]"}) {
      mvc.perform(post("/api/lessons/{id}/tasks", lessonId).with(user(admin)).contentType(MediaType.APPLICATION_JSON)
          .content("{\"taskType\":\"NUMERIC\",\"statementMd\":\"Task\",\"hints\":"+hints+"}"))
          .andExpect(status().isBadRequest());
    }
    mvc.perform(get("/api/lessons/{id}/task-outline", lessonId))
        .andExpect(status().isOk()).andExpect(jsonPath("$[0].hints").doesNotExist());
  }

  @Test
  void paidAndUnpublishedLessonsDoNotExposeHints() throws Exception {
    long id = createTest();
    mvc.perform(put("/api/tasks/{id}", id).with(user(admin)).contentType(MediaType.APPLICATION_JSON)
        .content("{\"taskType\":\"TEST\",\"statementMd\":\"Private\",\"hints\":[\"Private hint\"]}"))
        .andExpect(status().isOk());
    tx.executeWithoutResult(status -> {
      var course=em.find(com.qlc.shared.model.entities.Course.class, courseId);
      course.setPrice(new java.math.BigDecimal("100"));
    });
    mvc.perform(get("/api/lessons/{id}/learn", lessonId).with(user(learner)))
        .andExpect(status().isOk()).andExpect(jsonPath("hasAccess").value(false))
        .andExpect(jsonPath("tasks.length()").value(0));
    tx.executeWithoutResult(status -> em.find(com.qlc.shared.model.entities.Lesson.class, lessonId).setPublished(false));
    mvc.perform(get("/api/lessons/{id}/learn", lessonId).with(user(learner)))
        .andExpect(status().isOk()).andExpect(jsonPath("hasAccess").value(false))
        .andExpect(jsonPath("tasks.length()").value(0));
  }
}
