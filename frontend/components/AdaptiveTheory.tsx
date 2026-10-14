"use client";

import { useEffect, useState } from "react";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import { courseLanguage } from "@/components/courseLanguages";
import { getLessonTheory } from "@/services/api";
import type { SubmissionLanguage } from "@/types";

export function AdaptiveTheory({ lessonId, language }: { lessonId: number; language: SubmissionLanguage | null }) {
  const [document, setDocument] = useState<{ lessonId: number; requested: SubmissionLanguage; content: string; fallback: boolean } | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!language) return;
    let active = true;
    setError(false);
    setDocument(null);
    void getLessonTheory(lessonId).then(data => {
      if (!active) return;
      // Another tab may have changed the saved preference. Do not label a different version as this language.
      if (data.language && data.language !== language) { setError(true); return; }
      setDocument({ lessonId, requested: language, content: data.contentMd ?? "Материал урока пока не добавлен.", fallback: data.fallback });
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [lessonId, language, attempt]);

  if (!language) return <p className="text-muted">Выберите язык решений выше — откроется теория с примерами на этом языке.</p>;
  if (error) return <div role="alert"><p>Не удалось загрузить теорию. Если язык менялся в другой вкладке, обновите страницу.</p><button className="qlc-text-link mt-3" onClick={() => setAttempt(n => n + 1)} type="button">Повторить загрузку</button></div>;
  if (!document || document.lessonId !== lessonId || document.requested !== language) return <p role="status" className="text-muted">Загружаем теорию: {courseLanguage(language).label}…</p>;
  return <>
    <p className="mb-6 text-sm text-muted">{document.fallback ? `Версия для ${courseLanguage(language).label} пока не добавлена. Ниже базовый материал урока.` : `Теория и примеры: ${courseLanguage(language).label}`}</p>
    <SafeMarkdown markdown={document.content} />
  </>;
}
