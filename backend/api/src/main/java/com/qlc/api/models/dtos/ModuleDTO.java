package com.qlc.api.models.dtos;

public record ModuleDTO(Long id, Long courseId, String name, String description, Integer position, Integer level) {
  public ModuleDTO(Long id, Long courseId, String name, String description, Integer position) {
    this(id, courseId, name, description, position, null);
  }
}
