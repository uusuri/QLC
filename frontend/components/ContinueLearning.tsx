"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { ButtonLink, Panel, PanelBody, PanelHeader, Progress } from "@/components/ui";
import { getMyLearningCourses } from "@/services/api";
import { getNextLearningLesson, type NextLearningLesson } from "@/services/learningProgress";

type ContinueLearningCardProps = {
  nextLesson: NextLearningLesson;
};

export function ContinueLearningCard({ nextLesson }: ContinueLearningCardProps) {
  const { course, lesson, module } = nextLesson;

  return (
    <Panel className="!border-phosphor/25 !bg-[#16191c] !text-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
      <PanelHeader className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-phosphor">Продолжить обучение</p>
          <p className="mt-4 text-sm font-medium text-white/58">{course.name} · {module.name}</p>
          <h2 className="mt-2 text-2xl font-bold leading-tight tracking-[-0.035em] sm:text-4xl">{lesson.name}</h2>
        </div>
        <ButtonLink className="w-full bg-phosphor text-ink hover:bg-white lg:w-auto" href={`/lessons/${lesson.id}`}>
          Продолжить
        </ButtonLink>
      </PanelHeader>
      <PanelBody className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="max-w-2xl text-sm leading-relaxed text-white/62">{lesson.description || "Откройте урок и продолжайте с того места, где остановились."}</p>
          <div className="mt-4">
            <Progress label="Прогресс урока" value={lesson.progressPercent} />
          </div>
        </div>
        <p className="font-mono text-sm font-bold text-white/74">{lesson.solvedTasks}/{lesson.totalTasks} задач</p>
      </PanelBody>
    </Panel>
  );
}

export function HomeContinueLearning() {
  const { user } = useAuth();
  const [nextLesson, setNextLesson] = useState<NextLearningLesson | null>(null);

  useEffect(() => {
    if (!user) {
      setNextLesson(null);
      return;
    }

    let active = true;
    getMyLearningCourses()
      .then((courses) => {
        if (active) setNextLesson(getNextLearningLesson(courses));
      })
      .catch(() => {
        if (active) setNextLesson(null);
      });

    return () => {
      active = false;
    };
  }, [user]);

  return nextLesson ? <ContinueLearningCard nextLesson={nextLesson} /> : null;
}
