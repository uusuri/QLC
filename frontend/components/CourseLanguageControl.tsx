"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui";
import { COURSE_LANGUAGES, courseLanguage } from "@/components/courseLanguages";
import { getCourseLanguage, selectCourseLanguage } from "@/services/api";
import type { CourseLanguageSettingsDto, SubmissionLanguage } from "@/types";

export function CourseLanguageControl({ courseId, onChange }: {
  courseId: number;
  onChange?: (language: SubmissionLanguage) => void;
}) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CourseLanguageSettingsDto | null>(null);
  const [choice, setChoice] = useState<SubmissionLanguage | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await getCourseLanguage(courseId);
      setSettings(data);
      setChoice(data.selectedLanguage);
      if (data.selectedLanguage) onChangeRef.current?.(data.selectedLanguage);
      else setOpen(true);
    } catch {
      setError("Не удалось загрузить язык курса. Попробуйте ещё раз.");
    }
  }, [courseId]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setSettings(null);
    setOpen(false);
    setError("");
    void getCourseLanguage(courseId).then(data => {
      if (!active) return;
      setSettings(data);
      setChoice(data.selectedLanguage);
      if (data.selectedLanguage) onChangeRef.current?.(data.selectedLanguage);
      else setOpen(true);
    }).catch(() => { if (active) setError("Не удалось загрузить язык курса. Попробуйте ещё раз."); });
    return () => { active = false; };
  }, [courseId, user?.id]);

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);

  async function save() {
    if (!choice) return;
    setBusy(true);
    setError("");
    try {
      const data = await selectCourseLanguage(courseId, choice);
      setSettings(data);
      if (data.selectedLanguage) onChangeRef.current?.(data.selectedLanguage);
      setOpen(false);
      window.dispatchEvent(new Event("qlc:learning-updated"));
    } catch {
      setError("Не удалось сохранить язык. Попробуйте ещё раз.");
    } finally { setBusy(false); }
  }

  if (!user) return null;
  return <div className="my-5">
    <div className="flex flex-wrap items-center gap-4">
      <span className="text-sm text-muted">Язык решений: {settings?.selectedLanguage ? courseLanguage(settings.selectedLanguage).label : "не выбран"}</span>
      <Button variant="secondary" disabled={busy} onClick={() => {
        if (!settings) { void load(); return; }
        setChoice(settings.selectedLanguage);
        setError("");
        setOpen(true);
      }}>{settings?.selectedLanguage ? "Сменить язык" : "Выбрать язык"}</Button>
    </div>
    {error && !open && <p className="mt-3 text-sm text-[#FF8074]" role="alert">{error}</p>}
    <dialog className="kit-dialog w-[min(560px,calc(100%-32px))]" ref={dialog} aria-labelledby={`language-title-${courseId}`}
      onCancel={event => { if (busy) event.preventDefault(); else setOpen(false); }} onClose={() => setOpen(false)}>
      <h2 id={`language-title-${courseId}`}>{settings?.selectedLanguage ? "Сменить язык решений" : "На каком языке будете решать задачи?"}</h2>
      <p>Выбор сохранится для этого курса. Его можно изменить в любой момент — черновики каждого языка сохраняются отдельно.</p>
      <fieldset className="my-5 grid grid-cols-2 gap-2" disabled={busy}>
        <legend className="sr-only">Язык программирования</legend>
        {COURSE_LANGUAGES.filter(item => settings?.availableLanguages.includes(item.id)).map(item => <label key={item.id}
          className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-sm border px-3 py-3 text-sm ${choice === item.id ? "border-acid text-acid" : "border-line"}`}>
          <input type="radio" name={`course-language-${courseId}`} value={item.id} checked={choice === item.id} onChange={() => setChoice(item.id)} />
          {item.label}
        </label>)}
      </fieldset>
      {error && <p className="mb-4 text-sm text-[#FF8074]" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-3"><Button disabled={!choice || busy} loading={busy} onClick={() => void save()}>Сохранить язык</Button>
        <Button disabled={busy} variant="secondary" onClick={() => setOpen(false)}>{settings?.selectedLanguage ? "Отмена" : "Позже"}</Button></div>
    </dialog>
  </div>;
}
