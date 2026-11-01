package com.qlc.api.models.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CodeRunRequest(@NotBlank String language, @NotBlank @Size(max = 65535) String sourceCode,
    @NotNull @Size(min = 1, max = 10) List<@NotNull @Valid TestCase> tests) {
  public record TestCase(@NotNull @Size(max = 16384) String input, @Size(max = 16384) String output) { }
}
