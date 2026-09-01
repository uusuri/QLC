"use client";

import { CourseCard } from "@/components/CourseCard";
import { useLearningOverview } from "@/components/LearningOverviewProvider";
import type { CourseDto } from "@/types";

type CourseListProps = {
  courses: CourseDto[];
};

export function CourseList({ courses }: CourseListProps) {
  const learningCourses = useLearningOverview();
  const boughtIds = new Set(learningCourses.map((course) => course.id));

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {courses.map((course, index) => {
        const courseId = Number(course.slug.replace(/^course-/, ""));
        const isBought = Number.isSafeInteger(courseId) && courseId > 0 && boughtIds.has(courseId);

        return (
          <CourseCard
            course={course}
            index={index}
            isBought={isBought}
            key={course.slug}
          />
        );
      })}
    </div>
  );
}
