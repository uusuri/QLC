package com.qlc.models.requests;

import jakarta.validation.constraints.NotBlank;

public record CourseLanguageRequest(@NotBlank String selectedLanguage) {}
