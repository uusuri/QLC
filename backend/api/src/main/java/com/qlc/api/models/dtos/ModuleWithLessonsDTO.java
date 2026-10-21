package com.qlc.api.models.dtos;

import java.util.List;

public record ModuleWithLessonsDTO(ModuleDTO module, List<LessonDTO> lessons) {
}
