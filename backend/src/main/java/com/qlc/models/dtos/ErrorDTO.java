package com.qlc.models.dtos;

import java.util.Map;

public record ErrorDTO(
    String code,
    String message,
    String traceId,
    Map<String, String> fieldErrors // Сюда складываем ошибки валидации полей (например, "sourceCode": "too large")
) {
}
