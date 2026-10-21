package com.qlc.api.models.requests;

import jakarta.validation.constraints.NotBlank;

public record AccountTokenRequest(@NotBlank String token) {
}
