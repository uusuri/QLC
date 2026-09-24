package com.qlc.models.dtos;

/** Public task metadata; statements are only available through authorized learning/admin APIs. */
public record TaskOutlineDTO(Long id, String taskType) {
}
