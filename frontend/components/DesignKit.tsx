import type { CSSProperties } from "react";

/** Paths are the original exports in QLC-Design-Kit, not recreated artwork. */
const identities: [RegExp, string][] = [
  [/typescript/i, "05-TypeScript"], [/javascript/i, "04-JavaScript"],
  [/spring/i, "08-Spring"], [/java/i, "01-Java"], [/c\+\+|с\+\+|cpp/i, "02-Cpp"],
  [/python/i, "03-Python"], [/\bgo\b|golang/i, "06-Go"], [/rust/i, "07-Rust"],
  [/postgres/i, "12-PostgreSQL"], [/sql/i, "11-SQL"], [/redis/i, "13-Redis"],
  [/docker/i, "14-Docker"], [/kubernetes/i, "15-Kubernetes"], [/linux/i, "16-Linux"],
  [/git/i, "17-Git"], [/алгорит|algorithm/i, "18-Algorithms"],
  [/матем|алгебр|math/i, "20-Mathematics"], [/frontend|фронтенд/i, "10-Frontend"],
  [/backend|бэкенд/i, "09-Backend"]
];

export function courseArtworkPath(title: string) {
  const identity = identities.find(([pattern]) => pattern.test(title))?.[1] ?? "19-Computer-Science";
  return `/design/course-artworks/Course-${identity}.svg`;
}

export function CourseArtwork({ title, className = "" }: { title: string; className?: string }) {
  return <img alt="" className={`kit-course-art ${className}`} height={300} loading="lazy" src={courseArtworkPath(title)} width={640} />;
}

export function KitIcon({ name, className = "" }: { name: "diamond" | "menu" | "close" | "search" | "arrow" | "play" | "check" | "code" | "user" | "info" | "warning" | "eye"; className?: string }) {
  return <span aria-hidden="true" className={`kit-icon ${className}`} style={{ "--icon": `url(/design/utility-icons/${name}.svg)` } as CSSProperties} />;
}
