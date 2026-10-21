package com.qlc.api.models.dtos;

/** Only the accessible variant, with an explicit fallback when adaptation is not yet authored. */
public record LessonTheoryDTO(String contentMd, String language, boolean fallback) {}
