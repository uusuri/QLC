"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getMyDailySubmissions, getSubmissionHistoryDetail } from "../services/api";
import { historyStatus } from "../services/submissionHistory";
import { activityDateLabel } from "../services/activity";
import { SubmissionPayload } from "./SubmissionPayload";
import type { DailySubmissionDto, DailySubmissionsDto, SubmissionHistoryDetailDto } from "../types";

function SubmissionDetail({ item, cache }: { item: DailySubmissionDto; cache: Map<string, SubmissionHistoryDetailDto> }) {
  const [detail, setDetail] = useState<SubmissionHistoryDetailDto | null>(() => cache.get(item.id) ?? null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const cached = cache.get(item.id);
    if (cached) { setDetail(cached); return; }
    const controller = new AbortController();
    setDetail(null);
    setError("");
    void getSubmissionHistoryDetail(item.taskId, item.id, controller.signal).then(value => {
      if (value.id !== item.id || value.taskId !== item.taskId) throw new Error("Не удалось загрузить посылку.");
      if (!controller.signal.aborted) { cache.set(item.id, value); setDetail(value); }
    }).catch(err => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Не удалось загрузить посылку.");
    });
    return () => controller.abort();
  }, [item.taskId, item.id, attempt, cache]);
  return <div className="kit-daily-detail" aria-label="Сохранённое решение" aria-busy={!detail && !error}>
    <div className="kit-daily-payload">
      {error ? <p className="text-xs text-muted" role="alert">{error} <button className="text-acid" type="button" onClick={() => setAttempt(value => value + 1)}>Повторить</button></p>
        : detail ? <SubmissionPayload detail={detail} taskType={item.taskType} /> : <p role="status" className="text-xs text-muted">Загрузка…</p>}
    </div>
    <Link href={`/lessons/${item.lessonId}?task=${item.taskId}`} className="shrink-0 text-xs text-acid">К задаче ↗</Link>
  </div>;
}

type DailySubmissionsViewProps = {
  date: string;
  page: number;
  data: DailySubmissionsDto | null;
  error: string;
  selectedId: string | null;
  cache: Map<string, SubmissionHistoryDetailDto>;
  onSelect: (id: string) => void;
  onPageChange: (page: number) => void;
  onReload: () => void;
  onClose: () => void;
};

export function DailySubmissionsView({ date, page, data, error, selectedId, cache, onSelect, onPageChange, onReload, onClose }: DailySubmissionsViewProps) {
  return <section aria-label={`Посылки за ${activityDateLabel(date)}`} className="kit-daily-submissions mt-3 border-t border-line pt-3">
    <header className="mb-2 flex items-center justify-between gap-3 text-sm">
      <h3>{activityDateLabel(date)}</h3>
      <button aria-label="Закрыть посылки за день" className="flex h-8 w-8 items-center justify-center text-lg text-muted hover:text-paper" type="button" onClick={onClose}>×</button>
    </header>
    <div className="kit-daily-workspace">
      <div className="kit-daily-list" aria-label="Список посылок" aria-busy={!data && !error} tabIndex={0}>
        {error ? <p className="kit-daily-placeholder text-xs text-muted" role="alert">{error} <button className="text-acid" type="button" onClick={onReload}>Повторить</button></p>
          : !data ? <p className="kit-daily-placeholder text-xs text-muted" role="status">Загрузка…</p>
          : !data.items.length ? <p className="kit-daily-placeholder text-xs text-muted">Нет посылок.</p>
          : <ul>{data.items.map(item => <li className="border-t border-white/5 first:border-t-0" key={item.id}>
        <button className={`kit-daily-row flex w-full items-center gap-3 text-left text-xs hover:text-acid${selectedId === item.id ? " is-selected" : ""}`} type="button" aria-expanded={selectedId === item.id}
          onClick={() => onSelect(item.id)}>
          <time className="shrink-0 font-mono text-muted" dateTime={item.createdAt}>{new Intl.DateTimeFormat("ru-RU", { hour:"2-digit", minute:"2-digit", timeZone:"Europe/Moscow" }).format(new Date(item.createdAt))}</time>
          <span className="min-w-0 flex-1 truncate">{item.lessonName} · #{item.taskId}</span>
          <span className={item.verdict === "AC" && item.status === "FINISHED" ? "text-acid" : "text-muted"} title={historyStatus(item)}>{item.status === "FINISHED" && item.verdict ? item.verdict : historyStatus(item)}</span>
          <span aria-hidden="true" className="text-muted">{selectedId === item.id ? "−" : "+"}</span>
        </button>
        {selectedId === item.id && <SubmissionDetail key={item.id} item={item} cache={cache} />}
      </li>)}</ul>}
      </div>
    </div>
    <nav aria-label="Страницы посылок за день" className="kit-daily-pagination mt-2 flex items-center justify-between text-xs text-muted">
      <button className="min-h-8 disabled:opacity-30" disabled={page === 0 || !data} type="button" onClick={() => onPageChange(page - 1)}>← Назад</button>
      <span>{page + 1}</span>
      <button className="min-h-8 disabled:opacity-30" disabled={!data?.hasNext} type="button" onClick={() => onPageChange(page + 1)}>Далее →</button>
    </nav>
  </section>;
}

export function DailySubmissions({ date, onClose }: { date: string; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<DailySubmissionsDto | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cache = useRef(new Map<string, SubmissionHistoryDetailDto>());
  useEffect(() => {
    const controller = new AbortController();
    cache.current.clear();
    setData(null); setError(""); setSelectedId(null);
    void getMyDailySubmissions(date, page, controller.signal).then(value => {
      if (value.date !== date || value.page !== page || !Array.isArray(value.items)) throw new Error("Не удалось получить посылки за этот день.");
      if (!controller.signal.aborted) setData(value);
    }).catch(err => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Не удалось загрузить посылки.");
    });
    return () => controller.abort();
  }, [date, page, attempt]);
  return <DailySubmissionsView date={date} page={page} data={data} error={error} selectedId={selectedId} cache={cache.current}
    onSelect={id => setSelectedId(previous => previous === id ? null : id)} onClose={onClose}
    onPageChange={setPage} onReload={() => setAttempt(value => value + 1)} />;
}
