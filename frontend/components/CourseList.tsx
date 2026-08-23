"use client";

import { useEffect, useState } from "react";

import { CourseCard } from "@/components/CourseCard";
import { useAuth } from "@/components/AuthProvider";
import { getMyCourses } from "@/services/api";
import type { CourseDto } from "@/types";

type CourseListProps = {
  courses: CourseDto[];
};

export function CourseList({ courses }: CourseListProps) {
  const { loading, user } = useAuth();
  const [boughtIds, setBoughtIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      setBoughtIds(new Set());
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
  }, [loading, user?.id]);

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
