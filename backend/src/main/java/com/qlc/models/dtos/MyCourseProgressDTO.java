package com.qlc.models.dtos;

import java.util.List;

/** Полная учебная карта одного купленного пользователем курса. */
public record MyCourseProgressDTO(
    Long id,
    String name,
    String description,
    int solvedTasks,
    int totalTasks,
    int progressPercent,
    List<ModuleProgressDTO> modules) {
}
