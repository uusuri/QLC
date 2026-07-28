import { AddToCartButton } from "@/components/AddToCartButton";
import { ButtonLink, StatusBadge } from "@/components/ui";
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
      <div className="relative aspect-[16/9] overflow-hidden border-b border-line bg-[radial-gradient(circle_at_85%_15%,rgba(255,106,61,0.24),transparent_32%),linear-gradient(135deg,#1a1718,#090808)] p-5">
        <CourseCover title={course.title} />
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
          <p className="font-mono text-xs font-bold uppercase text-white/46">
            {course.lessonsCount > 0 ? course.lessonsLabel : "Программа готовится"}
          </p>
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

function CourseCover({ title }: { title: string }) {
  const normalizedTitle = title.toLowerCase();
  const isCpp = normalizedTitle.includes("c++") || normalizedTitle.includes("с++");
  const isMath = normalizedTitle.includes("матем") || normalizedTitle.includes("алгебр");
  const label = isCpp ? "C++" : isMath ? "MATH" : "QLC";
  const code = isCpp
    ? ["#include <iostream>", "int main() {", "  std::cout << \"hello\";", "}"]
    : isMath
      ? ["f(x) = x² + 2x + 1", "lim  f(x)", "x→∞", "∫ f(x) dx"]
      : ["learn", "build", "solve", "repeat"];

  return (
    <div className="absolute inset-0 p-5">
      <div className="flex items-start justify-between">
        <span className="border border-acid/60 bg-acid/10 px-2 py-1 font-mono text-xs font-black tracking-[0.18em] text-acid">
          {label}
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
          Practical track
        </span>
      </div>
      <pre className="mt-7 overflow-hidden font-mono text-xs leading-6 text-white/62 sm:text-sm">
        <code>
          {code.map((line, lineIndex) => (
            <span className="block" key={`${line}-${lineIndex}`}>
              <span className="mr-3 select-none text-white/22">{String(lineIndex + 1).padStart(2, "0")}</span>
              {line}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
