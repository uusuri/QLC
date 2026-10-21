package com.qlc.api.services;

import com.qlc.api.exceptions.ResourceNotFoundException;
import com.qlc.shared.model.entities.*;
import com.qlc.shared.model.enums.SubmissionStatus;
import com.qlc.shared.model.enums.Verdict;
import com.qlc.api.models.requests.AnswerRequest;
import com.qlc.api.models.responses.SubmissionResponse;
import com.qlc.shared.repositories.SubmissionRepository;
import com.qlc.api.repositories.TaskRepository;
import com.qlc.api.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.TreeSet;

@Service
@Transactional
public class InstantAnswerService {
  private final TaskRepository tasks;
  private final UserRepository users;
  private final SubmissionRepository submissions;
  private final TaskAccessService access;

  public InstantAnswerService(TaskRepository tasks, UserRepository users,
      SubmissionRepository submissions, TaskAccessService access) {
    this.tasks = tasks;
    this.users = users;
    this.submissions = submissions;
    this.access = access;
  }

  public SubmissionResponse submit(Long taskId, AnswerRequest request, Long userId) {
    Task task = tasks.findById(taskId).orElseThrow(() -> new ResourceNotFoundException("Task not found"));
    access.requireAccess(task, userId);
    String submittedAnswer;
    boolean accepted;
    if (task instanceof NumericTask numeric) {
      String raw = request.numericAnswer();
      if (request.selectedOptionIndexes() != null || raw == null || raw.length() > 256
          || !raw.trim().matches("[+-]?(?:[0-9]+(?:\\.[0-9]+)?|\\.[0-9]+)")) {
        throw new IllegalArgumentException("Введите число строкой с точкой в качестве десятичного разделителя");
      }
      if (numeric.getCorrectNumericAnswer() == null) throw new IllegalStateException("Numeric task has no answer");
      BigDecimal answer = new BigDecimal(raw.trim());
      submittedAnswer = answer.toPlainString();
      accepted = answer.compareTo(numeric.getCorrectNumericAnswer()) == 0;
    } else if (task instanceof TestTask test) {
      List<Integer> selected = request.selectedOptionIndexes();
      List<Integer> correct = test.getCorrectOptionIndexes();
      int optionCount = test.getOptions() == null ? 0 : test.getOptions().size();
      if (correct == null || correct.isEmpty() || correct.stream().anyMatch(i -> i == null || i < 0 || i >= optionCount)) {
        throw new IllegalStateException("Test task has invalid correct option indexes");
      }
      if (request.numericAnswer() != null || selected == null || selected.isEmpty() || selected.size() > 1000
          || selected.stream().anyMatch(i -> i == null || i < 0 || i >= optionCount)) {
        throw new IllegalArgumentException("Выберите допустимые варианты ответа");
      }
      var selectedSet = new TreeSet<>(selected);
      var correctSet = new HashSet<>(correct);
      if (correctSet.size() == 1 && selectedSet.size() != 1) {
        throw new IllegalArgumentException("В этой задаче можно выбрать только один ответ");
      }
      submittedAnswer = selectedSet.toString().replace(" ", "");
      accepted = selectedSet.equals(correctSet);
    } else {
      throw new IllegalArgumentException("Для CODE-задач используйте отправку кода");
    }

    Submission submission = new Submission();
    submission.setTask(task);
    submission.setUser(users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found")));
    submission.setSubmittedAnswer(submittedAnswer);
    submission.setStatus(SubmissionStatus.FINISHED);
    submission.setVerdict(accepted ? Verdict.AC : Verdict.WA);
    submissions.save(submission);
    return new SubmissionResponse(submission.getId(), taskId, null, "FINISHED", submission.getVerdict().name(),
        null, null, null, submission.getCreatedAt());
  }
}
