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
    <Panel className="overflow-hidden border-acid/60 shadow-[0_0_42px_rgba(255,106,61,0.1)]">
      <PanelHeader className="grid gap-5 border-b border-acid/30 bg-acid/[0.05] sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-acid">Продолжить обучение</p>
          <p className="mt-3 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/42">{course.name} · {module.name}</p>
          <h2 className="mt-2 text-2xl font-black uppercase leading-tight sm:text-4xl">{lesson.name}</h2>
        </div>
        <ButtonLink href={`/lessons/${lesson.id}`}>Продолжить</ButtonLink>
      </PanelHeader>
      <PanelBody className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="text-sm leading-relaxed text-white/60">{lesson.description || "Откройте урок и продолжайте с того места, где остановились."}</p>
          <div className="mt-4"><Progress label="Прогресс урока" value={lesson.progressPercent} /></div>
        </div>
        <p className="font-mono text-sm font-black text-acid">{lesson.solvedTasks}/{lesson.totalTasks} задач</p>
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
