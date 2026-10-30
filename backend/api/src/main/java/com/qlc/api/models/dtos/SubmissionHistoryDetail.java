package com.qlc.api.models.dtos;

import java.util.UUID;

/** Only the owner's original payload, never expected answers or private judge inputs. */
public record SubmissionHistoryDetail(UUID id, Long taskId, String language, String sourceCode,
    String submittedAnswer) {}
