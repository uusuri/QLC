package com.qlc.api.models.dtos;

import java.util.List;

public record CourseStructureDTO(CourseDTO course, List<ModuleWithLessonsDTO> modules) {
}
