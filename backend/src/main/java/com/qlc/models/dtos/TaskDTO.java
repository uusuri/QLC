package com.qlc.models.dtos;

import java.math.BigDecimal;
import java.util.List;

public record TaskDTO(
    Long id,
    Long lessonId,
    String taskType,
    String statementMd,

    // поля для CODE задач
    String starterCode,
    Integer timeLimitMs,
    Integer memoryLimitKb,
    Integer outputLimitKb,
    Integer testSetVersion,
    String templateCode,
    String testCases,

    // поля для TEST задач
    List<String> options,
    List<Integer> correctOptionIndexes,

    // поля для NUMERIC задач ---
    BigDecimal correctNumericAnswer) {
}
