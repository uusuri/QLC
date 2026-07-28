import type { LessonProgressDto, ModuleProgressDto, MyCourseProgressDto } from "@/types";

export type NextLearningLesson = {
  course: MyCourseProgressDto;
  module: ModuleProgressDto;
  lesson: LessonProgressDto;
};

export function getNextLearningLesson(courses: MyCourseProgressDto[]): NextLearningLesson | null {
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
