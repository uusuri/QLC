package com.qlc.api.models.dtos;

import java.util.List;

/** Модуль купленного курса вместе с доступными уроками и их прогрессом. */
public record ModuleProgressDTO(
    Long id,
    String name,
    String description,
    Integer position,
    List<LessonProgressDTO> lessons) {
}
