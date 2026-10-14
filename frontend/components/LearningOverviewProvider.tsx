"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { usePathname } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";
import { getMyLearningCourses } from "@/services/api";
import type { MyCourseProgressDto } from "@/types";

const LearningOverviewContext = createContext<MyCourseProgressDto[]>([]);

export function LearningOverviewProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
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

    let requestId = 0;
    const refresh = () => {
      const currentRequest = ++requestId;
      getMyLearningCourses()
        .then((nextCourses) => {
          if (active && currentRequest === requestId) setCourses(nextCourses);
        })
        .catch(() => {
          if (active && currentRequest === requestId) setCourses([]);
        });
    };
    refresh();
    window.addEventListener("qlc:learning-updated", refresh);

    return () => {
      active = false;
      window.removeEventListener("qlc:learning-updated", refresh);
    };
  }, [loading, user?.id, pathname]);

  return (
    <LearningOverviewContext.Provider value={courses}>
      {children}
    </LearningOverviewContext.Provider>
  );
}

export function useLearningOverview() {
  return useContext(LearningOverviewContext);
}
