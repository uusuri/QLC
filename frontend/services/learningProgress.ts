import type { LessonProgressDto, ModuleProgressDto, MyCourseProgressDto } from "@/types";

export type NextLearningLesson = {
  course: MyCourseProgressDto;
  module: ModuleProgressDto;
  lesson: LessonProgressDto;
  taskId?: number;
};

export function getNextLearningLesson(courses: MyCourseProgressDto[]): NextLearningLesson | null {
  // A saved position takes priority, even when the task already has an AC.
  for (const course of courses) {
    if (course.lastLessonId == null || course.lastTaskId == null) continue;
    for (const module of course.modules) {
      const lesson = module.lessons.find((item) => item.id === course.lastLessonId);
      if (lesson) return { course, module, lesson, taskId: course.lastTaskId };
    }
  }

  const orderedCourses = [...courses].sort((left, right) => left.id - right.id);

  for (const course of orderedCourses) {
    const modules = [...course.modules].sort((left, right) => left.position - right.position);
    for (const module of modules) {
      const lessons = [...module.lessons].sort((left, right) => left.position - right.position);
      const lesson = lessons.find((item) => item.totalTasks === 0 || item.progressPercent < 100);
      if (lesson) {
        return { course, module, lesson };
      }
    }
  }

  return null;
}

export function getLearningHref(nextLesson: NextLearningLesson): string {
  const path = `/lessons/${nextLesson.lesson.id}`;
  return nextLesson.taskId == null ? path : `${path}?task=${nextLesson.taskId}`;
}
