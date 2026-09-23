package com.qlc.models.dtos;

import java.util.List;

/** Публичные поля задачи без приватных тестов и правильных ответов. */
public record LearnerTaskDTO(
    Long id,
    Long lessonId,
    String taskType,
    String language,
    String statementMd,
    String starterCode,
    Integer timeLimitMs,
    Integer memoryLimitKb,
    Integer outputLimitKb,
    Integer testSetVersion,
    String templateCode,
    List<String> options) {
}
