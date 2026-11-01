package com.qlc.api.services;

import com.qlc.api.exceptions.ResourceNotFoundException;
import com.qlc.api.models.requests.CodeRunRequest;
import com.qlc.api.repositories.TaskRepository;
import com.qlc.shared.language.LanguageProfile;
import com.qlc.shared.model.entities.CodeTask;
import com.qlc.shared.runs.CodeRunJob;
import com.qlc.shared.runs.CodeRunResult;
import com.qlc.shared.runs.CodeRunStore;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@Service
public class CodeRunService {
  private final TaskRepository tasks;
  private final TaskAccessService access;
  private final CourseLanguageService languages;
  private final CodeRunStore runs;

  public CodeRunService(TaskRepository tasks, TaskAccessService access,
      CourseLanguageService languages, CodeRunStore runs) {
    this.tasks = tasks;
    this.access = access;
    this.languages = languages;
    this.runs = runs;
  }

  @Transactional(readOnly = true)
  public CodeRunResult create(Long taskId, Long userId, CodeRunRequest request) {
    if (request.sourceCode() == null || request.sourceCode().isBlank() || bytes(request.sourceCode()) > 65535)
      throw new IllegalArgumentException("Код должен занимать от 1 до 65 535 байт.");
    if (!LanguageProfile.isRunnable(request.language()))
      throw new IllegalArgumentException("Для этого языка запуск пока недоступен.");
    if (request.tests() == null || request.tests().isEmpty() || request.tests().size() > 10)
      throw new IllegalArgumentException("Добавьте от 1 до 10 тестов.");
    int totalBytes = 0;
    for (var test : request.tests()) {
      if (test == null || test.input() == null || bytes(test.input()) > 16384 || bytes(test.output()) > 16384)
        throw new IllegalArgumentException("Ввод и ответ одного теста — не более 16 КБ каждый.");
      totalBytes += bytes(test.input()) + bytes(test.output());
    }
    if (totalBytes > 65536) throw new IllegalArgumentException("Общий размер тестов — не более 64 КБ.");
    var task = tasks.findById(taskId).orElseThrow(() -> new ResourceNotFoundException("Task not found"));
    access.requireAccess(task, userId);
    if (!(task instanceof CodeTask code)) throw new IllegalArgumentException("Запуск доступен только для задач с кодом.");
    var course = code.getLesson().getModule().getCourse();
    String selected = course.isMultilingual()
        ? languages.get(course.getId(), userId).selectedLanguage()
        : (code.getLanguage() == null || code.getLanguage().isBlank() ? "CPP23" : code.getLanguage());
    if (selected == null || !selected.equalsIgnoreCase(request.language()))
      throw new IllegalArgumentException("Выберите этот язык в курсе перед запуском.");
    if (code.getMemoryLimitKb() <= 0 || code.getTimeLimitMs() <= 0 || code.getOutputLimitKb() <= 0)
      throw new IllegalArgumentException("Для задачи не настроены ограничения запуска.");

    // Only client-supplied examples, never code.getTestCases() or template/answer fields.
    var job = new CodeRunJob(UUID.randomUUID(), userId, taskId, request.language().toUpperCase(java.util.Locale.ROOT),
        request.sourceCode(), request.tests().stream().map(t -> new CodeRunJob.TestCase(t.input(), t.output())).toList(),
        Math.min(code.getMemoryLimitKb(), 262144), Math.min(code.getTimeLimitMs(), 5000),
        Math.min(code.getOutputLimitKb(), 64));
    long accepted = runs.enqueue(job);
    if (accepted != 1) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
        accepted == 0 ? "Дождитесь предыдущего запуска и попробуйте ещё раз." : "Очередь запусков заполнена. Попробуйте позже.");
    return new CodeRunResult(job.id(), "QUEUED", null, List.of());
  }

  public CodeRunResult get(UUID id, Long userId) {
    var result = runs.find(id, userId);
    if (result == null) throw new ResourceNotFoundException("Запуск не найден или срок хранения истёк.");
    return result;
  }

  private int bytes(String value) { return value == null ? 0 : value.getBytes(StandardCharsets.UTF_8).length; }
}
