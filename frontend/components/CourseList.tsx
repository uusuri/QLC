"use client";

import { useMemo, useState } from "react";

import { KitIcon } from "@/components/DesignKit";
import { CourseCard } from "@/components/CourseCard";
import { useLearningOverview } from "@/components/LearningOverviewProvider";
import { parseCourseIdFromSlug } from "@/services/api";
import type { CourseDto } from "@/types";

type CourseListProps = { courses: CourseDto[]; home?: boolean };
type AccessFilter = "all" | "open" | "bought";

export function CourseList({ courses, home = false }: CourseListProps) {
  const learningCourses = useLearningOverview();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AccessFilter>("all");
  const boughtIds = useMemo(() => new Set(learningCourses.map((course) => course.id)), [learningCourses]);
  const isBought = (course: CourseDto) => {
    const courseId = parseCourseIdFromSlug(course.slug);
    return courseId !== null && boughtIds.has(courseId);
  };
  const normalizedQuery = query.trim().toLocaleLowerCase("ru");
  const visibleCourses = courses.filter((course) => (
    (filter === "all" || (filter === "open" && course.access === "open") || (filter === "bought" && isBought(course))) &&
    (!normalizedQuery || `${course.title} ${course.description}`.toLocaleLowerCase("ru").includes(normalizedQuery))
  ));
  const filters: { id: AccessFilter; label: string; count: number }[] = [
    { id: "all", label: "Все курсы", count: courses.length },
    { id: "open", label: "Бесплатные", count: courses.filter((course) => course.access === "open").length },
    ...(boughtIds.size > 0 ? [{ id: "bought" as const, label: "Мои курсы", count: courses.filter(isBought).length }] : [])
  ];

  return (
    <div className={home ? "" : "kit-catalog"}>
      {!home && <div className="qlc-catalog-controls">
        <div aria-label="Доступ к курсам" className="qlc-filter-list">
          {filters.map((item) => <button aria-pressed={filter === item.id} key={item.id} onClick={() => setFilter(item.id)} type="button">{item.label}<span className="font-mono text-[10px] opacity-60">{String(item.count).padStart(2, "0")}</span></button>)}
        </div>
        <label className="qlc-catalog-search">
          <KitIcon name="search" className="text-muted" />
          <span className="sr-only">Поиск курса</span><input onChange={(event) => setQuery(event.target.value)} placeholder="Найти своё направление" type="search" value={query} />
        </label>
      </div>
      }<p aria-live="polite" className="sr-only">Найдено курсов: {visibleCourses.length}</p>
      {visibleCourses.length > 0 ? (
        <div className={home ? "grid gap-8 md:grid-cols-2" : "kit-catalog-results"}>
          {visibleCourses.map((course) => <CourseCard course={course} index={courses.indexOf(course)} isBought={isBought(course)} home={home} key={course.slug} />)}
        </div>
      ) : (
        <div className="border border-white/15 p-8 sm:p-12">
          <h3 className="text-2xl font-bold">Курсы не найдены</h3><p className="mt-3 text-sm text-white/65">Попробуйте другое название или сбросьте фильтры.</p>
          <button className="qlc-text-link mt-4 text-phosphor" onClick={() => { setQuery(""); setFilter("all"); }} type="button">Показать все курсы <span aria-hidden="true">↗</span></button>
        </div>
      )}
    </div>
  );
}
