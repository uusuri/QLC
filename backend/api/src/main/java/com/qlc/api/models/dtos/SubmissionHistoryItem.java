package com.qlc.api.models.dtos;

import com.qlc.shared.model.enums.SubmissionStatus;
import com.qlc.shared.model.enums.Verdict;
import java.time.LocalDateTime;
import java.util.UUID;

/** History rows intentionally exclude code, submitted answers and judge diagnostics. */
public record SubmissionHistoryItem(UUID id, Long taskId, String language, SubmissionStatus status,
    Verdict verdict, Long executionTime, Long memoryUsed, LocalDateTime createdAt) {}
