"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { useAuth } from "@/components/AuthProvider";
import { getMyLearningCourses } from "@/services/api";
import type { MyCourseProgressDto } from "@/types";

const LearningOverviewContext = createContext<MyCourseProgressDto[]>([]);

export function LearningOverviewProvider({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  const [courses, setCourses] = useState<MyCourseProgressDto[]>([]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      setCourses([]);
      return;
    }

    let active = true;
    setCourses([]);

    getMyLearningCourses()
      .then((nextCourses) => {
        if (active) setCourses(nextCourses);
      })
      .catch(() => {
        if (active) setCourses([]);
      });

    return () => {
      active = false;
    };
  }, [loading, user?.id]);

  return (
    <LearningOverviewContext.Provider value={courses}>
      {children}
    </LearningOverviewContext.Provider>
  );
}

export function useLearningOverview() {
  return useContext(LearningOverviewContext);
}
