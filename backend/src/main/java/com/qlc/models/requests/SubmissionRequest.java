package com.qlc.models.requests;

import jakarta.validation.constraints.NotBlank;

public record SubmissionRequest(
    @NotBlank(message = "Language is required") String language,

    @NotBlank(message = "Source code cannot be empty") String sourceCode) {
}
