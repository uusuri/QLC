"use client";

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import { COURSE_LANGUAGES } from "@/components/courseLanguages";
import type { SubmissionLanguage } from "@/types";
import dynamic from "next/dynamic";
import { findGraphBlocks, insertGraphBlock, parseGraphAnimation, type GraphAnimation, type GraphBlockRange } from "../../services/graphAnimation";
import { graphPreset } from "../../services/graphPresets";

const GraphAnimationEditor = dynamic(() => import("../graph/GraphAnimationEditor").then(module => module.GraphAnimationEditor), { loading: () => <p className="p-4">Открываем редактор анимации…</p> });

export type TheoryVersion = SubmissionLanguage | "base";
export type TheoryContent = { contentMd: string; contentByLanguage: Partial<Record<SubmissionLanguage, string>> };
type View = "split" | "edit" | "preview";

type Props = {
  value: TheoryContent;
  saved: TheoryContent;
  languages: SubmissionLanguage[];
  multilingual: boolean;
  version: TheoryVersion;
  onVersionChange: (version: TheoryVersion) => void;
  onChange: (value: TheoryContent) => void;
  onSave: () => void;
  onAnimationEditingChange: (editing: boolean) => void;
  busy: boolean;
};

function content(value: TheoryContent, version: TheoryVersion) {
  return version === "base" ? value.contentMd : value.contentByLanguage[version] ?? "";
}

export function LessonTheoryEditor({ value, saved, languages, multilingual, version, onVersionChange, onChange, onSave, onAnimationEditingChange, busy }: Props) {
  const id = useId();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [view, setView] = useState<View>("split");
  const [copyFrom, setCopyFrom] = useState<TheoryVersion>("base");
  const [graph, setGraph] = useState<{ start: number; end: number; original: string; version: TheoryVersion; animation: GraphAnimation } | null>(null);
  const [graphError, setGraphError] = useState("");
  const versions = multilingual
    ? [...COURSE_LANGUAGES.filter(language => languages.includes(language.id)).map(language => ({ id: language.id as TheoryVersion, label: language.label })), { id: "base" as const, label: "Общий текст" }]
    : [{ id: "base" as const, label: "Теория" }];
  const active = versions.find(item => item.id === version) ?? versions[0];
  const text = content(value, active.id);
  const preview = useDeferredValue(text);
  const graphBlocks = useMemo(() => findGraphBlocks(text), [text]);
  const locked = busy || graph !== null;
  const editingAnimation = graph !== null;
  const completed = languages.filter(language => value.contentByLanguage[language]?.trim()).length;
  const sources = versions.filter(item => item.id !== active.id && content(value, item.id).trim());
  const source = sources.find(item => item.id === copyFrom) ?? sources[0];
  const fence = COURSE_LANGUAGES.find(item => item.id === active.id)?.monaco ?? "text";

  useEffect(() => {
    // A new lesson/version should open at its beginning, without carrying over another language's cursor.
    if (textarea.current) { textarea.current.scrollTop = 0; textarea.current.setSelectionRange(0, 0); }
  }, [active.id]);

  useEffect(() => {
    onAnimationEditingChange(editingAnimation);
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    if (editingAnimation) window.addEventListener("beforeunload", warn);
    return () => { onAnimationEditingChange(false); window.removeEventListener("beforeunload", warn); };
  }, [editingAnimation, onAnimationEditingChange]);

  function update(next: string) {
    onChange(active.id === "base" ? { ...value, contentMd: next }
      : { ...value, contentByLanguage: { ...value.contentByLanguage, [active.id]: next } });
  }

  function insert(before: string, after = "", placeholder = "Текст") {
    const input = textarea.current;
    const start = input?.selectionStart ?? text.length;
    const end = input?.selectionEnd ?? start;
    const selected = text.slice(start, end) || placeholder;
    update(text.slice(0, start) + before + selected + after + text.slice(end));
    setView(current => current === "preview" ? "split" : current);
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function openGraph(block?: GraphBlockRange) {
    try {
      const cursor = textarea.current?.selectionStart ?? text.length;
      const existing = block ?? graphBlocks.find(item => cursor >= item.start && cursor <= item.end);
      const start = existing?.start ?? cursor;
      if (!existing && text.slice(0, start).split("\n").filter(line => line.trim().startsWith("```")).length % 2) {
        throw new Error("Поставьте курсор вне блока кода, чтобы вставить анимацию.");
      }
      setGraph({ start, end: existing?.end ?? start, original: text, version: active.id,
        animation: existing ? parseGraphAnimation(existing.source) : graphPreset("blank") });
      setGraphError("");
    } catch (error) { setGraphError(error instanceof Error ? error.message : "Не удалось открыть блок."); }
  }

  return <section className="min-w-0 overflow-hidden rounded-sm border border-line bg-ink" aria-label="Редактор теории">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
      <div><h3 className="font-semibold">Теория урока</h3><p className="mt-1 text-xs text-muted">{multilingual ? `${completed} из ${languages.length} языковых версий заполнено. Изменения сохраняются вместе.` : "Markdown и предпросмотр, как в уроке."}</p></div>
      <div className="flex flex-wrap gap-1" aria-label="Вид редактора">
        {([{ id: "edit", label: "Текст" }, { id: "split", label: "Рядом" }, { id: "preview", label: "Просмотр" }] as const).map(item => <button
          key={item.id} type="button" aria-pressed={view === item.id} onClick={() => setView(item.id)}
          className={`min-h-10 rounded-sm px-3 text-xs transition focus-visible:outline-acid ${view === item.id ? "bg-acid text-ink" : "text-muted hover:bg-white/5 hover:text-paper"}`}>{item.label}</button>)}
      </div>
    </div>
    {multilingual && <div className="flex flex-wrap gap-2 border-b border-line p-3" role="group" aria-label="Язык теории">
      {versions.map(item => {
        const filled = Boolean(content(value, item.id).trim());
        const changed = content(value, item.id) !== content(saved, item.id);
        return <button key={item.id} type="button" disabled={locked} aria-pressed={active.id === item.id} onClick={() => onVersionChange(item.id)}
          title={`${item.label}: ${changed ? "есть несохранённые изменения" : filled ? "текст добавлен" : "пока пусто"}`}
          className={`inline-flex min-h-10 items-center gap-2 rounded-sm border px-3 text-sm focus-visible:outline-acid ${active.id === item.id ? "border-acid bg-acid/10 text-acid" : "border-line text-muted hover:border-white/40 hover:text-paper"}`}>
          {item.label}<span aria-label={changed ? "Не сохранено" : filled ? "Заполнено" : "Пусто"} className={changed ? "text-amber-300" : filled ? "text-acid" : "text-muted"}>{changed ? "●" : filled ? "✓" : "○"}</span>
        </button>;
      })}
    </div>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 text-xs">
      <p className="text-muted">Редактируется: <strong className="text-paper">{active.label}</strong>{active.id === "base" && multilingual ? ". Этот текст показывается, если языковой версии нет." : ". Другие версии остаются на своих вкладках."}</p>
      {!text.trim() && source && <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Откуда скопировать теорию" value={source.id} onChange={event => setCopyFrom(event.target.value as TheoryVersion)} className="min-h-10 min-w-0 border border-line bg-panel px-2 text-paper">
          {sources.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <button type="button" disabled={locked} onClick={() => update(content(value, source.id))} className="min-h-10 px-2 text-acid disabled:opacity-40">Взять за основу</button>
      </div>}
    </div>
    {view !== "preview" && <div className="flex flex-wrap gap-1 border-b border-line px-3 py-2" aria-label="Форматирование Markdown">
      {[
        { label: "Заголовок", action: () => insert("\n## ", "\n", "Название раздела") },
        { label: "Жирный", action: () => insert("**", "**") },
        { label: "Список", action: () => insert("\n- ", "\n", "Первый пункт") },
        { label: "Код", action: () => insert(`\n\`\`\`${fence}\n`, "\n```\n", "Пример кода") },
        { label: "Таблица", action: () => insert("\n", "\n", "| Случай | Оценка |\n| --- | --- |\n| Один проход | O(n) |") },
        { label: "Ссылка", action: () => insert("[", "](https://example.com)", "Название источника") }
      ].map(item => <button key={item.label} type="button" disabled={locked} onClick={item.action}
        className="min-h-9 rounded-sm px-3 text-xs text-muted hover:bg-white/5 hover:text-paper focus-visible:outline-acid disabled:opacity-40">{item.label}</button>)}
    </div>}
    <div className="flex flex-wrap gap-2 border-b border-line p-3">
      <button type="button" disabled={locked} onClick={() => openGraph()} className="min-h-10 rounded-sm border border-line px-3 text-sm text-acid disabled:opacity-40">Анимация</button>
      {graphBlocks.map((block, index) => <button key={block.start} type="button" disabled={locked} onClick={() => openGraph(block)} className="min-h-10 px-3 text-sm disabled:opacity-40">Изменить анимацию {index + 1}</button>)}
    </div>
    {graphError && <p role="alert" className="p-3 text-sm text-red-300">{graphError}</p>}
    {graph && <GraphAnimationEditor initial={graph.animation} onCancel={() => setGraph(null)} onApply={animation => {
      if (busy || text !== graph.original || active.id !== graph.version) throw new Error("Теория изменилась. Закройте редактор анимации и откройте его заново, чтобы не потерять изменения.");
      update(insertGraphBlock(text, graph.start, graph.end, animation));
      setGraph(null);
    }} />}
    <div className={`grid min-w-0 ${view === "split" ? "xl:grid-cols-2" : ""}`}>
      {view !== "preview" && <div className="min-w-0">
        <label htmlFor={`${id}-text`} className="block border-b border-line bg-white/[.02] px-4 py-2 text-xs text-muted">Markdown · {active.label}</label>
        <textarea ref={textarea} id={`${id}-text`} value={text} disabled={locked} spellCheck={false}
          onChange={event => update(event.target.value)}
          onKeyDown={event => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); if (!busy) onSave(); }
          }}
          placeholder="Напишите объяснение, добавьте примеры и таблицы…"
          className="block h-[min(65vh,760px)] min-h-[360px] w-full resize-y border-0 bg-ink p-4 font-mono text-sm leading-7 text-paper outline-none focus:ring-1 focus:ring-inset focus:ring-acid disabled:opacity-50" />
      </div>}
      {view !== "edit" && <div className={`min-w-0 ${view === "split" ? "border-t border-line xl:border-l xl:border-t-0" : ""}`}>
        <p className="border-b border-line bg-white/[.02] px-4 py-2 text-xs text-muted">Предпросмотр · {active.label}</p>
        <div aria-label={`Предпросмотр теории: ${active.label}`} className="h-[min(65vh,760px)] min-h-[360px] overflow-auto p-4 sm:p-6">
          {preview.trim() ? <SafeMarkdown markdown={preview} /> : <p className="text-sm leading-7 text-muted">Здесь появится материал в том виде, в котором его увидит ученик.</p>}
        </div>
      </div>}
    </div>
    <div className="flex flex-wrap justify-between gap-2 border-t border-line px-4 py-3 text-xs text-muted"><span>{text.length.toLocaleString("ru-RU")} символов</span><span>⌘S / Ctrl+S — сохранить урок и все версии</span></div>
  </section>;
}
