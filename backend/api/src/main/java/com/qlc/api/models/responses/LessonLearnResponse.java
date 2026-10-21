package com.qlc.api.models.responses;

import com.qlc.api.models.dtos.CourseDTO;
import com.qlc.api.models.dtos.LessonDTO;
import com.qlc.api.models.dtos.LearnerTaskDTO;
import com.qlc.api.models.dtos.ModuleDTO;

import java.util.List;

public record LessonLearnResponse(
    CourseDTO course,
    ModuleDTO module,
    LessonDTO lesson,
    List<LearnerTaskDTO> tasks,
    List<Long> acceptedTaskIds,
    boolean hasAccess) {
}
