package com.qlc.models.dtos;

import com.qlc.models.enums.SubmissionStatus;
import com.qlc.models.enums.Verdict;
import java.time.LocalDateTime;
import java.util.UUID;

/** Лёгкая проекция для polling без загрузки исходного кода submission. */
public record SubmissionResultDTO(
    UUID id,
    Long taskId,
    Long userId,
    String language,
    SubmissionStatus status,
    Verdict verdict,
    Long executionTime,
    Long memoryUsed,
    String safeMessage,
    LocalDateTime createdAt) {
}
