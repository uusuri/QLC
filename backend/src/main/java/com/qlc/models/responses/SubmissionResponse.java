package com.qlc.models.responses;

import java.time.LocalDateTime;
import java.util.UUID;

public record SubmissionResponse(
    UUID id,
    Long taskId,
    String language,
    String status,
    String verdict,
    Long executionTime,
    Long memoryUsed,
    String safeMessage,
    LocalDateTime createdAt) {
}
