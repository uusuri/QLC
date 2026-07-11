package com.qlc.models.messages;

import java.util.UUID;

/**
 * Redis Stream schema v1. submissionId is UUID; taskId is the current Long JPA
 * identifier. sourceCode is sensitive and must never be written to logs.
 */
public record SubmissionStreamMessage(
    String schemaVersion,
    UUID submissionId,
    Long taskId,
    String sourceCode) {
}
