"use client";

import Image from "next/image";

import { AddToCartButton } from "@/components/AddToCartButton";
import { ButtonLink, Progress, StatusBadge } from "@/components/ui";
import { COURSE_ACCESS_COPY, parseCourseIdFromSlug } from "@/services/api";
import type { CourseDto } from "@/types";

type CourseCardProps = {
  course: CourseDto;
  index: number;
  isBought?: boolean;
};

export function CourseCard({ course, index, isBought = false }: CourseCardProps) {
  const isOpen = course.access === "open";
  const isLocked = course.access === "locked";
  const canOpen = isOpen || isBought;
  const courseId = parseCourseIdFromSlug(course.slug);

  return (
    <article className="group flex flex-col overflow-hidden border border-line bg-ink/92 transition hover:border-acid/50 hover:bg-white/[0.03]">
      <div className="relative aspect-[16/10] overflow-hidden border-b border-line">
        <Image
          alt={course.title}
          className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          src={course.imageUrl}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {isBought ? (
            <StatusBadge tone="success">Куплено</StatusBadge>
          ) : (
            <StatusBadge tone={isOpen ? "success" : isLocked ? "warning" : "neutral"}>
              {COURSE_ACCESS_COPY[course.access].label}
            </StatusBadge>
          )}
          {course.badge && course.badge !== "course" && (
            <StatusBadge tone="info">{course.badge}</StatusBadge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/44">
            {String(index + 1).padStart(2, "0")}
          </p>
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/44">
            {course.price.formatted}
          </p>
        </div>

        <h3 className="text-2xl font-black uppercase leading-tight">{course.title}</h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-white/60">{course.description}</p>

        <div className="mt-5 grid gap-4">
          <Progress label={course.title} value={Math.min(100, course.lessonsCount * 3)} />
          {canOpen ? (
            <ButtonLink href={`/courses/${course.slug}`}>Открыть курс</ButtonLink>
          ) : isLocked && courseId !== null ? (
            <AddToCartButton courseId={courseId} courseSlug={course.slug} />
          ) : (
            <ButtonLink disabled href={`/courses/${course.slug}`} variant="secondary">
              Скоро
            </ButtonLink>
          )}
        </div>
      </div>
    </article>
  );
}
