package com.qlc.models.responses;

import com.qlc.models.dtos.CourseDTO;
import com.qlc.models.dtos.LessonDTO;
import com.qlc.models.dtos.LearnerTaskDTO;
import com.qlc.models.dtos.ModuleDTO;

import java.util.List;

public record LessonLearnResponse(
    CourseDTO course,
    ModuleDTO module,
    LessonDTO lesson,
    List<LearnerTaskDTO> tasks) {
}
