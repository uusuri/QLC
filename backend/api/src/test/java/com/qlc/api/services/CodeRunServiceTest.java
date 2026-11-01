package com.qlc.api.services;

import com.qlc.api.models.requests.CodeRunRequest;
import com.qlc.api.repositories.TaskRepository;
import com.qlc.shared.model.entities.CodeTask;
import com.qlc.shared.model.entities.Course;
import com.qlc.shared.model.entities.Lesson;
import com.qlc.shared.runs.CodeRunJob;
import com.qlc.shared.runs.CodeRunStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CodeRunServiceTest {
  TaskRepository tasks = mock(TaskRepository.class);
  TaskAccessService access = mock(TaskAccessService.class);
  CourseLanguageService languages = mock(CourseLanguageService.class);
  CodeRunStore runs = mock(CodeRunStore.class);
  CodeRunService service = new CodeRunService(tasks, access, languages, runs);
  CodeTask task;

  @BeforeEach void fixture() {
    var course = new Course(); course.setId(3L);
    var module = new com.qlc.shared.model.entities.Module(); module.setCourse(course);
    var lesson = new Lesson(); lesson.setModule(module);
    task = new CodeTask(); task.setId(42L); task.setLesson(lesson);
    task.setTestCases("PRIVATE_TESTS_MUST_NEVER_BE_USED");
    when(tasks.findById(42L)).thenReturn(Optional.of(task));
    when(runs.enqueue(any())).thenReturn(1L);
  }

  CodeRunRequest request() {
    return new CodeRunRequest("CPP23", "int main() {}", List.of(new CodeRunRequest.TestCase("", null)));
  }

  @Test void queuesOnlyUserTestsWithServerLimitsAndNoSubmission() {
    var result = service.create(42L, 7L, request());
    var job = ArgumentCaptor.forClass(CodeRunJob.class);
    verify(access).requireAccess(task, 7L);
    verify(runs).enqueue(job.capture());
    assertThat(result.status()).isEqualTo("QUEUED");
    assertThat(job.getValue().tests()).containsExactly(new CodeRunJob.TestCase("", null));
    assertThat(job.getValue().memoryLimitKb()).isEqualTo(65536);
    assertThat(job.getValue().outputLimitKb()).isEqualTo(64);
    assertThat(job.getValue().toString()).doesNotContain("PRIVATE_TESTS");
  }

  @Test void alsoRunsTasksWithoutJudgeTests() {
    task.setTestCases(null);
    assertThat(service.create(42L, 7L, request()).status()).isEqualTo("QUEUED");
  }

  @Test void refusesInaccessibleTaskBeforeEnqueue() {
    doThrow(new AccessDeniedException("no access")).when(access).requireAccess(task, 7L);
    assertThatThrownBy(() -> service.create(42L, 7L, request())).isInstanceOf(AccessDeniedException.class);
    verify(runs, never()).enqueue(any());
  }

  @Test void checksLanguageAndMultilingualSelection() {
    assertThatThrownBy(() -> service.create(42L, 7L, new CodeRunRequest("JAVA21", "code", request().tests())))
        .isInstanceOf(IllegalArgumentException.class);
    task.getLesson().getModule().getCourse().setMultilingual(true);
    when(languages.get(3L, 7L)).thenReturn(new com.qlc.api.models.dtos.CourseLanguageDTO(true, List.of("CPP23"), "CPP23"));
    assertThat(service.create(42L, 7L, request()).status()).isEqualTo("QUEUED");
  }

  @Test void validatesCountsBytesAndBlankSource() {
    for (CodeRunRequest invalid : List.of(
        new CodeRunRequest("CPP23", " ", request().tests()),
        new CodeRunRequest("CPP23", "я".repeat(40000), request().tests()),
        new CodeRunRequest("CPP23", "code", List.of()),
        new CodeRunRequest("CPP23", "code", java.util.Collections.nCopies(11, new CodeRunRequest.TestCase("", null))),
        new CodeRunRequest("CPP23", "code", List.of(new CodeRunRequest.TestCase("я".repeat(9000), null))),
        new CodeRunRequest("CPP23", "code", java.util.Collections.nCopies(5, new CodeRunRequest.TestCase("x".repeat(16000), null))),
        new CodeRunRequest("RUST2021", "code", request().tests()))) {
      assertThatThrownBy(() -> service.create(42L, 7L, invalid)).isInstanceOf(IllegalArgumentException.class);
    }
    verify(runs, never()).enqueue(any());
  }

  @Test void returns429ForBusyUserOrFullQueue() {
    for (long result : List.of(0L, -1L)) {
      when(runs.enqueue(any())).thenReturn(result);
      assertThatThrownBy(() -> service.create(42L, 7L, request())).isInstanceOfSatisfying(ResponseStatusException.class,
          error -> assertThat(error.getStatusCode().value()).isEqualTo(429));
    }
  }
}
