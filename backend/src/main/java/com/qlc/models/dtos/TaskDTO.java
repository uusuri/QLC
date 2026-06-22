package com.qlc.models.dtos;

public record TaskDTO(Long id, Long lessonId, String taskType, String taskText, String templateCode) {
}
