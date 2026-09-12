import Link from "next/link";
import { CourseArtwork } from "@/components/DesignKit";
import { COURSE_ACCESS_COPY } from "@/services/api";
import type { CourseDto } from "@/types";

export function CourseCard({ course, index, isBought = false, home = false }: { course: CourseDto; index: number; isBought?: boolean; home?: boolean }) {
  const href = `/courses/${course.slug}`;
  return <article className={`kit-course-card ${home ? "kit-course-card--home" : ""}`}>
    <Link aria-label={`О курсе «${course.title}»`} href={href}><CourseArtwork title={course.title} /></Link>
    <div className="kit-course-card-body">
      <p className="qlc-eyebrow">{String(index + 1).padStart(2, "0")} / Программирование</p>
      <h3><Link href={href}>{course.title}</Link></h3>
      <p className="kit-description">{course.description}</p>
      {!home && <><p className="kit-course-facts">{course.lessonsCount > 0 ? course.lessonsLabel : "Программа готовится"} · {isBought ? "Доступ открыт" : COURSE_ACCESS_COPY[course.access].label}</p><p className="kit-price">{isBought ? "Ваш курс" : course.access === "open" ? "Бесплатно" : course.price.formatted}</p></>}
      <Link className={home ? "qlc-text-link" : "kit-outline-link"} href={href}>{home ? "Программа курса" : "О курсе"} <span aria-hidden="true">→</span></Link>
    </div>
  </article>;
}
