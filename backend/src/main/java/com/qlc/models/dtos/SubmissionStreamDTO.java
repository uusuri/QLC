package com.qlc.models.dtos;

public record SubmissionStreamDTO(
    String schemaVersion,
    String submissionId,
    String taskId,
    String sourceCode) {
}
