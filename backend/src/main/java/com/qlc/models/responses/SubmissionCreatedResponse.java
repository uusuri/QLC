package com.qlc.models.responses;

import java.util.UUID;

public record SubmissionCreatedResponse(
    UUID id,
    String status) {
}
