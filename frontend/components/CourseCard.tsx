import { AddToCartButton } from "@/components/AddToCartButton";
import { ButtonLink } from "@/components/ui";
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
    <article className="group flex flex-col overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.035] transition duration-300 hover:-translate-y-1 hover:border-phosphor/30 hover:bg-white/[0.055] focus-within:border-phosphor/45">
      <div className="relative aspect-[16/9] overflow-hidden border-b border-white/8 bg-[#dfffa8] p-6 text-ink sm:aspect-[16/10]">
        <CourseCover index={index} title={course.title} />
        <div className="absolute left-5 top-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-phosphor" />
            {isBought ? "Куплено" : COURSE_ACCESS_COPY[course.access].label}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/58">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-phosphor" />
            {course.lessonsCount > 0 ? course.lessonsLabel : "Программа готовится"}
          </span>
          <span className="font-semibold text-white/84">{course.price.formatted}</span>
        </div>

        <h3 className="mt-5 text-2xl font-bold leading-tight tracking-[-0.035em]">{course.title}</h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-white/62">{course.description}</p>

        <div className="mt-6">
          {canOpen ? (
            <ButtonLink className="w-full" href={`/courses/${course.slug}`}>Посмотреть курс</ButtonLink>
          ) : isLocked && courseId !== null ? (
            <AddToCartButton courseId={courseId} courseSlug={course.slug} />
          ) : (
            <ButtonLink className="w-full" disabled href={`/courses/${course.slug}`} variant="secondary">
              Скоро
            </ButtonLink>
          )}
        </div>
      </div>
    </article>
  );
}

function CourseCover({ index, title }: { index: number; title: string }) {
  const normalizedTitle = title.toLowerCase();
  const isCpp = normalizedTitle.includes("c++") || normalizedTitle.includes("с++");
  const isMath = normalizedTitle.includes("матем") || normalizedTitle.includes("алгебр");
  const label = isCpp ? "C++" : isMath ? "MATH" : "QLC";

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden p-6">
      <span className="absolute -bottom-7 -right-3 text-[116px] font-black leading-none tracking-[-0.09em] text-ink/[0.08] sm:text-[140px]">
        {label}
      </span>
      <div className="absolute bottom-6 left-6">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink/45">
          Курс {String(index + 1).padStart(2, "0")}
        </p>
        <p className="mt-1 text-4xl font-black tracking-[-0.07em]">{label}</p>
      </div>
      <div className="absolute right-6 top-6 h-11 w-11 rotate-45 bg-ink sm:h-12 sm:w-12">
        <span className="grid h-full w-full -rotate-45 place-items-center font-mono text-[10px] font-bold text-phosphor">
          QLC
        </span>
      </div>
    </div>
  );
}
