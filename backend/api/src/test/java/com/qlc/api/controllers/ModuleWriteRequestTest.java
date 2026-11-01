package com.qlc.api.controllers;

import com.qlc.api.models.requests.ModuleWriteRequest;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;

class ModuleWriteRequestTest {
  private final JsonMapper mapper = JsonMapper.builder().build();

  @Test
  void distinguishesAnOldClientFromExplicitClearAndValidLevel() {
    var omitted = mapper.readValue("{\"name\":\"Basics\"}", ModuleWriteRequest.class);
    assertThat(omitted.hasLevel()).isFalse();
    assertThat(omitted.toDto().level()).isNull();
    var cleared = mapper.readValue("{\"name\":\"Basics\",\"level\":null}", ModuleWriteRequest.class);
    assertThat(cleared.hasLevel()).isTrue();
    assertThat(cleared.toDto().level()).isNull();
    var assigned = mapper.readValue("{\"name\":\"Basics\",\"level\":2}", ModuleWriteRequest.class);
    assertThat(assigned.hasLevel()).isTrue();
    assertThat(assigned.toDto().level()).isEqualTo(2);
  }
}
