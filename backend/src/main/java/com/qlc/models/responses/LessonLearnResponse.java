package com.qlc.models.responses;

import com.qlc.models.dtos.LessonDTO;
import com.qlc.models.dtos.TaskDTO;

import java.util.List;

public record LessonLearnResponse(LessonDTO lesson, List<TaskDTO> tasks) {
}
