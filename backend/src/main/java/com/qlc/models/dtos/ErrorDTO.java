package com.qlc.models.dtos;

import java.util.Map;
import java.util.UUID;

public record ErrorDTO(
    String code,
    String message,
    String traceId,
    Map<String, String> fieldErrors) {
  public static ErrorDTO of(String code, String message) {
    return new ErrorDTO(code, message, UUID.randomUUID().toString(), Map.of());
  }
}
