package com.qlc.models.dtos;

/** Один доступный ученику урок и агрегированный прогресс по его задачам. */
public record LessonProgressDTO(
    Long id,
    String name,
    String description,
    Integer position,
    int solvedTasks,
    int totalTasks,
    int progressPercent) {
}
