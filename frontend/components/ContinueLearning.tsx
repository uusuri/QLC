"use client";

import { CourseArtwork } from "@/components/DesignKit";
import { useLearningOverview } from "@/components/LearningOverviewProvider";
import { ButtonLink, Progress } from "@/components/ui";
import { getLearningHref, getNextLearningLesson, type NextLearningLesson } from "@/services/learningProgress";

type ContinueLearningCardProps = {
  nextLesson: NextLearningLesson;
};

export function ContinueLearningCard({ nextLesson }: ContinueLearningCardProps) {
  const { course, lesson, module } = nextLesson;

  return <section className="kit-continue">
    <CourseArtwork title={course.name} />
    <div className="min-w-0"><p className="qlc-eyebrow">Продолжить обучение</p><p className="mt-3">{course.name} / {module.name}</p><h2>{lesson.name}</h2><p>{lesson.description || "Откройте урок и продолжайте обучение."}</p></div>
    <div className="kit-continue-actions"><Progress label={`Решено ${lesson.solvedTasks} / ${lesson.totalTasks} задач`} value={lesson.totalTasks > 0 ? lesson.progressPercent : null} /><ButtonLink href={getLearningHref(nextLesson)}>Продолжить обучение →</ButtonLink></div>
  </section>;
}

export function HomeContinueLearning() {
  const courses = useLearningOverview();
  const nextLesson = getNextLearningLesson(courses);

  return nextLesson ? <ContinueLearningCard nextLesson={nextLesson} /> : null;
}
