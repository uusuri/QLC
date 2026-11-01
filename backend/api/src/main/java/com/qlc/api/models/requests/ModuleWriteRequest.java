package com.qlc.api.models.requests;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.qlc.api.models.dtos.ModuleDTO;
import lombok.Getter;
import lombok.Setter;

/** Tracks omitted level separately from explicit null, so older editors cannot erase it. */
@Getter
@Setter
public class ModuleWriteRequest {
  private String name;
  private String description;
  private Integer position;
  @Setter(lombok.AccessLevel.NONE)
  private Integer level;
  @Getter(lombok.AccessLevel.NONE)
  @Setter(lombok.AccessLevel.NONE)
  private boolean levelProvided;

  @JsonSetter("level")
  public void setLevel(Integer level) {
    this.level = level;
    this.levelProvided = true;
  }

  public boolean hasLevel() {
    return levelProvided;
  }

  public ModuleDTO toDto() {
    return new ModuleDTO(null, null, name, description, position, level);
  }
}
