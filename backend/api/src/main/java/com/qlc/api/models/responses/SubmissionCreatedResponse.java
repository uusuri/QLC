package com.qlc.api.models.responses;

import java.util.UUID;

public record SubmissionCreatedResponse(
    UUID id,
    String status) {
}
