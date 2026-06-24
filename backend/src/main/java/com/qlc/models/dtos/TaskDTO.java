package com.qlc.models.dtos;

import java.math.BigDecimal;
import java.util.List;

public record TaskDTO(
    Long id,
    Long lessonId,
    String taskType,
    String taskText,
    String templateCode,
    String testCases,
    List<String> options,
    Integer correctOptionIndex,
    BigDecimal correctNumericAnswer) {
}
