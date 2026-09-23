package com.qlc.models.dtos;

import java.util.List;

public record ModuleWithLessonsDTO(ModuleDTO module, List<LessonDTO> lessons) {
}
