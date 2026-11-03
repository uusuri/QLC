"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CourseLanguageControl } from "@/components/CourseLanguageControl";
import { AddToCartButton } from "@/components/AddToCartButton";
import { PageState } from "@/components/PageState";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button, ButtonLink } from "@/components/ui";
import { CourseProgram } from "@/components/CourseProgram";
import {
  getAuthToken,
  getCourseAccess,
  getCourseLearningView,
  parseCourseIdFromSlug
} from "@/services/api";
import type { CourseLearningViewDto } from "@/types";

export default function CoursePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const [view, setView] = useState<CourseLearningViewDto | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setHasAccess(false);
    setLoadError("");

    async function load() {
      try {
        const data = await getCourseLearningView(slug);
        if (ignore) return;

        setView(data);
        if (data?.catalogCourse.access === "open") {
          setHasAccess(true);
          return;
        }

        const courseId = parseCourseIdFromSlug(slug);
        if (data && courseId !== null && getAuthToken()) {
          try {
            const access = await getCourseAccess(courseId);
            if (!ignore) setHasAccess(access);
          } catch {
            if (!ignore) setHasAccess(false);
          }
        }
      } catch (error) {
        if (!ignore) {
          setLoadError(error instanceof Error ? error.message : "Не удалось загрузить курс.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [slug, attempt]);

  if (loading) {
    return <PageState eyebrow="Загрузка" title="Загрузка курса" text="Получаем программу." />;
  }

  if (loadError) {
    return <PageState eyebrow="Ошибка" title="Курс недоступен" text={loadError}>
      <Button className="mt-4" onClick={() => setAttempt(value => value + 1)}>Повторить загрузку</Button>
    </PageState>;
  }

  if (!view) {
    return (
      <PageState
        eyebrow="Не найден"
        title="Курс не найден"
        text="Вернитесь в каталог и выберите другой курс."
      />
    );
  }

  const isPaid = view.catalogCourse.access === "locked";
  const canStudy = !isPaid || hasAccess;
  const courseId = parseCourseIdFromSlug(slug);

  return (
    <div className="kit-shell">
      <SiteHeader />
      <main className="kit-page kit-course-page" id="main-content" tabIndex={-1}>
        <Link className="text-sm text-muted hover:text-paper" href="/courses">← Курсы</Link>
        <header className="kit-course-heading" id="purchase">
          <div className="min-w-0">
            <h1>{view.course.name}</h1>
            {!canStudy && <p className="mt-2 text-sm text-muted">{view.catalogCourse.price.formatted}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {view.course.multilingual && canStudy && (
              <CourseLanguageControl compact key={view.course.id} courseId={view.course.id} />
            )}
            {canStudy && view.firstLesson && (
              <ButtonLink variant="secondary" className="!min-h-10 !px-3 !py-2 !text-sm" href={`/lessons/${view.firstLesson.id}`}>
                Первый урок →
              </ButtonLink>
            )}
            {!canStudy && courseId !== null && <AddToCartButton courseId={courseId} courseSlug={slug} />}
          </div>
        </header>
        <CourseProgram key={view.course.id} courseId={view.course.id} modules={view.modules} canStudy={canStudy} />
      </main>
      <SiteFooter />
    </div>
  );
}
