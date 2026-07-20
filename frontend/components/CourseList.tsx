"use client";

import { useEffect, useState } from "react";

import { CourseCard } from "@/components/CourseCard";
import { getMyCourses, getAuthToken } from "@/services/api";
import type { CourseDto } from "@/types";

type CourseListProps = {
  courses: CourseDto[];
};

export function CourseList({ courses }: CourseListProps) {
  const [boughtIds, setBoughtIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!getAuthToken()) {
      return;
    }

    let ignore = false;

    async function load() {
      try {
        const myCourses = await getMyCourses();
        if (!ignore) {
          setBoughtIds(new Set(myCourses.map((course) => course.id)));
        }
      } catch {
        // Не блокируем витрину, если не удалось загрузить список покупок.
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
