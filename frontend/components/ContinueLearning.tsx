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
    <Panel className="!bg-[#16191c] !text-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
      <PanelHeader className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-phosphor">Продолжить обучение</p>
          <p className="mt-4 text-sm font-medium text-white/45">{course.name} · {module.name}</p>
          <h2 className="mt-2 text-2xl font-bold leading-tight tracking-[-0.035em] sm:text-4xl">{lesson.name}</h2>
        </div>
        <ButtonLink className="bg-phosphor text-ink hover:bg-white" href={`/lessons/${lesson.id}`}>
          Продолжить
        </ButtonLink>
      </PanelHeader>
      <PanelBody className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="text-sm leading-relaxed text-white/55">{lesson.description || "Откройте урок и продолжайте с того места, где остановились."}</p>
          <div className="mt-4">
            <Progress label="Прогресс урока" value={lesson.progressPercent} />
          </div>
        </div>
        <p className="font-mono text-sm font-bold text-white/68">{lesson.solvedTasks}/{lesson.totalTasks} задач</p>
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
