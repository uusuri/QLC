package com.qlc.api.models.dtos;

public record SubmissionStreamDTO(
    String schemaVersion,
    String submissionId,
    String taskId,
    String sourceCode) {
}
