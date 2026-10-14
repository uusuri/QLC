package com.qlc.models.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record TelegramAuthRequest(
    @NotNull @Positive Long id,
    @NotBlank String firstName,
    String lastName,
    String username,
    String photoUrl,
    @NotNull @Positive Long authDate,
    @NotBlank String hash) {
}
