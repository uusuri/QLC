"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui";
import { SubmissionPayload } from "@/components/SubmissionPayload";
import { COURSE_LANGUAGES } from "@/components/courseLanguages";
import { getSubmissionHistory, getSubmissionHistoryDetail } from "@/services/api";
import { canRestoreSubmission, historyMetrics, historyStatus } from "@/services/submissionHistory";
import type { LearnerTaskDto, SubmissionHistoryDetailDto, SubmissionHistoryPageDto } from "@/types";

type Props = {
  task: LearnerTaskDto;
  refreshKey?: string;
  language?: string;
  restoreDisabled?: boolean;
  onRestore?: (detail: SubmissionHistoryDetailDto) => void;
};

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Дата неизвестна" : date.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}

function languageLabel(value: string | null | undefined): string {
  return COURSE_LANGUAGES.find(item => item.id === value)?.label ?? value ?? "Язык не указан";
}

export function SubmissionHistory(props: Props) {
  const { user } = useAuth();
  if (!user) return <p className="border border-line bg-surface p-6 text-sm text-muted">Войдите в аккаунт, чтобы увидеть свои попытки.</p>;
  return <HistoryContent key={`${user.id}:${props.task.id}`} {...props} />;
}

function HistoryContent({ task, refreshKey, language, restoreDisabled, onRestore }: Props) {
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<SubmissionHistoryPageDto | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SubmissionHistoryDetailDto | null>(null);
  const [detailError, setDetailError] = useState("");
  const [detailReload, setDetailReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError(""); setSelectedId(null); setDetail(null);
    void getSubmissionHistory(task.id, page, controller.signal).then(value => {
      if (!Array.isArray(value.items) || value.page !== page || value.items.some(item => item.taskId !== task.id))
        throw new Error("Не удалось получить историю этой задачи.");
      if (!controller.signal.aborted) setData(value);
    }).catch(failure => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Не удалось загрузить попытки.");
    });
    return () => controller.abort();
  }, [task.id, page, reload, refreshKey]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    setDetail(null); setDetailError("");
    void getSubmissionHistoryDetail(task.id, selectedId, controller.signal).then(value => {
      if (value.id !== selectedId || value.taskId !== task.id) throw new Error("Ответ относится к другой попытке.");
      if (!controller.signal.aborted) setDetail(value);
    }).catch(failure => {
      if (!controller.signal.aborted) setDetailError(failure instanceof Error ? failure.message : "Не удалось загрузить решение.");
    });
    return () => controller.abort();
  }, [task.id, selectedId, detailReload]);

  const selectedDetail = selectedId && <section className="kit-history-detail" aria-label="Сохранённое решение">
    {detailError ? <><p role="alert">{detailError}</p><Button variant="secondary" onClick={() => setDetailReload(value => value + 1)}>Повторить загрузку</Button></>
      : !detail ? <p role="status">Загружаем решение…</p>
      : <><SubmissionPayload detail={detail} taskType={task.taskType} />
        {typeof detail.sourceCode === "string" && onRestore && <>
          <Button disabled={restoreDisabled || !canRestoreSubmission(detail, task.id, language ?? "")}
            onClick={() => onRestore(detail)}>Загрузить в редактор</Button>
          {detail.language !== language && <p className="text-xs text-muted">{detail.language
            ? `Для загрузки выберите язык ${languageLabel(detail.language)}.`
            : "Язык попытки не сохранён. Код можно скопировать вручную."}</p>}
        </>}
      </>}
  </section>;

  return <section className="kit-history" aria-label="Мои попытки">
    <header className="kit-history-heading"><h2>Мои попытки</h2><Button variant="secondary" disabled={!data && !error}
      onClick={() => { setPage(0); setReload(value => value + 1); }}>Обновить</Button></header>
    {error ? <p role="alert" className="p-5 text-sm text-muted">{error}</p>
      : !data ? <p role="status" className="p-5 text-sm text-muted">Загружаем попытки…</p>
      : !data.items.length ? <p className="p-5 text-sm text-muted">{page === 0 ? "Вы ещё не отправляли решения этой задачи." : "На этой странице пока нет попыток."}</p>
      : <ul className="kit-history-list">{data.items.map(item => <li key={item.id}>
        <button type="button" aria-expanded={selectedId === item.id} className={`kit-history-row ${selectedId === item.id ? "is-selected" : ""}`}
          onClick={() => { setDetail(null); setDetailError(""); setSelectedId(previous => previous === item.id ? null : item.id); }}>
          <span><strong className={item.status === "FINISHED" && item.verdict === "AC" ? "text-acid" : ""}>{historyStatus(item)}</strong>
            <span className="kit-history-meta">{item.language ? languageLabel(item.language) : task.taskType === "NUMERIC" ? "Числовой ответ" : task.taskType === "TEST" ? "Тест" : "Код"}
              {historyMetrics(item) && ` · ${historyMetrics(item)}`}</span></span>
          <span className="kit-history-date"><time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time><span aria-hidden="true">{selectedId === item.id ? "↑" : "↓"}</span></span>
        </button>
        {selectedId === item.id && selectedDetail}
      </li>)}</ul>}
    {(data || error) && <nav className="kit-history-pagination" aria-label="Страницы попыток">
      <Button variant="secondary" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Назад</Button>
      <span>Страница {page + 1}</span>
      <Button variant="secondary" disabled={!data?.hasNext} onClick={() => setPage(value => value + 1)}>Далее</Button>
    </nav>}
  </section>;
}
