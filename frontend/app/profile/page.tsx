import Link from "next/link";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Alert, ButtonLink, Panel, PanelBody, PanelHeader, Progress } from "@/components/ui";
import { getStudentProfile } from "@/services/api";
import type { StudentCourseStatus } from "@/types";

// Словарь русских подписей для статусов курса.
const statusLabels: Record<StudentCourseStatus, string> = {
  active: "Активен",
  completed: "Пройден",
  locked: "Закрыт"
};

// Соответствие статусов и цветовых тонов.
const statusTone: Record<StudentCourseStatus, string> = {
  active: "border-acid text-acid",
  completed: "border-white/50 text-white",
  locked: "border-white/20 text-white/38"
};

export default async function ProfilePage() {
  const profile = await getStudentProfile();
  const { courses, stats } = profile;

  const solvedLabel = `${stats.solvedTasks} / ${stats.totalTasks}`;
  const openCoursesLabel = String(
    courses.filter((course) => course.status !== "locked").length
  ).padStart(2, "0");
  const remainingTasksLabel = String(stats.totalTasks - stats.solvedTasks);

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SiteHeader />

          <section className="mt-4 border border-line bg-ink/90">
            {/* Hero header */}
            <header className="grid gap-6 border-b border-line p-5 sm:p-7 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-acid">
                  student profile / rank {stats.rank}
                </p>
                <h1 className="mt-3 max-w-4xl text-4xl font-black uppercase leading-[1.04] sm:text-6xl lg:text-7xl">
                  Учебная статистика
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/58">
                  {stats.level} · {stats.streak}-дневная серия · {" "}
                  {stats.averageProgress}% среднего прогресса
                </p>
              </div>

              <div className="grid content-start gap-3 sm:flex sm:items-start lg:flex-col">
                <RankBadge rank={stats.rank} level={stats.level} />
                <ButtonLink href="/" variant="secondary">
                  К витрине
                </ButtonLink>
              </div>
            </header>

            {/* Stats grid */}
            <section className="grid border-b border-line lg:grid-cols-[1fr_1fr]">
              <div className="grid gap-5 border-b border-line p-5 sm:p-7 lg:border-b-0 lg:border-r">
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatBlock label="Решено задач" value={solvedLabel} tone="acid" />
                  <StatBlock label="Средний прогресс" value={`${stats.averageProgress}%`} tone="ember" />
                  <StatBlock label="Серия дней" value={`${stats.streak}`} tone="white" />
                </div>

                <Panel muted>
                  <PanelHeader>
                    <p className="font-mono text-xs font-black uppercase text-white/40">total progress</p>
                  </PanelHeader>
                  <PanelBody>
                    <Progress label="Общий прогресс обучения" value={stats.averageProgress} />
                  </PanelBody>
                </Panel>
              </div>

              <div className="grid content-between gap-6 p-5 sm:p-7">
                <div>
                  <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-acid">
                    learning map
                  </p>
                  <h2 className="mt-3 text-2xl font-black uppercase leading-[1.04] sm:text-4xl">
                    Активные курсы и текущий план.
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-px border border-line bg-line">
                  <MiniMetric label="Курсов открыто" value={openCoursesLabel} />
                  <MiniMetric label="Задач осталось" value={remainingTasksLabel} />
                </div>
              </div>
            </section>

            {/* Courses list */}
            <section className="p-5 sm:p-7">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-acid">
                    purchased / active
                  </p>
                  <h2 className="mt-2 text-3xl font-black uppercase sm:text-5xl">Мои курсы</h2>
                </div>
                <span className="font-mono text-xs font-black uppercase text-white/48">
                  {courses.length} course{courses.length === 1 ? "" : "s"}
                </span>
              </div>

              {courses.length === 0 ? (
                <Alert title="no courses" tone="warning">
                  У тебя пока нет курсов. Перейди на витрину, чтобы выбрать первый трек.
                </Alert>
              ) : (
                <div className="grid gap-px border border-line bg-line">
                  {courses.map((course, index) => (
                    <article
                      className="grid gap-5 bg-ink p-5 transition hover:bg-white/[0.03] sm:grid-cols-[64px_1fr_220px] sm:p-6"
                      key={course.title}
                    >
                      <div className="font-mono text-sm font-black text-white/48">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-3">
                          <h3 className="text-2xl font-black uppercase leading-[1.04] sm:text-4xl">
                            {course.title}
                          </h3>
                          <StatusPill status={course.status} />
                        </div>
                        <p className="max-w-2xl text-sm leading-snug text-white/60">
                          {course.level} · {course.nextLesson}
                        </p>
                      </div>

                      <div className="grid content-between gap-4">
                        <div className="flex items-center justify-between gap-4 font-mono text-xs font-black uppercase text-white/50">
                          <span>{statusLabels[course.status]}</span>
                          <span>
                            {course.solvedTasks} / {course.totalTasks}
                          </span>
                        </div>
                        <ProgressBar
                          muted={course.status === "locked"}
                          value={course.progressPercent}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
      </div>

      <div className="mx-auto max-w-7xl">
        <SiteFooter />
      </div>
    </main>
  );
}

function StatBlock({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "acid" | "ember" | "white";
}) {
  const toneClass =
    tone === "acid" ? "text-acid" : tone === "ember" ? "text-ember" : "text-white";

  return (
    <div className="relative overflow-hidden border border-line bg-panel/95 p-4">
      <p className="font-mono text-xs font-black uppercase text-white/40">{label}</p>
      <strong className={`mt-5 block text-3xl font-black uppercase leading-none sm:text-4xl ${toneClass}`}>
        {value}
      </strong>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel/95 p-4">
      <p className="font-mono text-[10px] font-black uppercase text-white/48">{label}</p>
      <strong className="mt-4 block text-4xl font-black leading-none text-acid">{value}</strong>
    </div>
  );
}

function ProgressBar({ value, muted = false }: { value: number; muted?: boolean }) {
  return (
    <div
      aria-label={`Прогресс ${value}%`}
      className="h-3 overflow-hidden border border-line bg-white/6"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <div
        className={muted ? "h-full bg-white/24" : "h-full bg-acid"}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function StatusPill({ status }: { status: StudentCourseStatus }) {
  return (
    <span
      className={`border px-2 py-1 font-mono text-[10px] font-black uppercase ${statusTone[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function RankBadge({ rank, level }: { rank: string; level: string }) {
  return (
    <div className="relative border border-acid bg-acid px-5 py-4 text-center text-ink shadow-[0_0_30px_rgba(255,106,61,0.25)]">
      <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
        Current rank
      </p>
      <p className="mt-1 text-2xl font-black uppercase leading-none sm:text-3xl">{rank}</p>
      <p className="mt-2 text-[10px] font-black uppercase opacity-70">{level}</p>
    </div>
  );
}
