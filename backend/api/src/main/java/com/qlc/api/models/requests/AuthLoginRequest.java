package com.qlc.api.models.requests;

import jakarta.validation.constraints.NotBlank;

public record AuthLoginRequest(
    @NotBlank(message = "Username or email is required")
    String username,

    @NotBlank(message = "Password is required")
    String password) {
}
