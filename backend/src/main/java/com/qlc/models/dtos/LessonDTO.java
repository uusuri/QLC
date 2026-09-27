package com.qlc.models.dtos;

import java.util.Map;

public record LessonDTO(Long id, Long moduleId, String name, String description, Integer position, String contentMd,
    Boolean published, Map<String, String> contentByLanguage) {
  public LessonDTO(Long id, Long moduleId, String name, String description, Integer position, String contentMd, Boolean published) {
    this(id, moduleId, name, description, position, contentMd, published, null);
  }
}
