"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alert, Button } from "@/components/ui";
import { submitAnswer } from "@/services/api";
import type { LearnerTaskDto } from "@/types";

export function InstantAnswerWorkspace({ task, onAccepted }: {
  task: LearnerTaskDto;
  onAccepted: (taskId: number) => void;
}) {
  const [numericAnswer, setNumericAnswer] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [verdict, setVerdict] = useState<"AC" | "WA" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const isNumeric = task.taskType === "NUMERIC";
  const multiple = Boolean(task.multipleAnswersAllowed);
  const numericId = `numeric-answer-${task.id}`;

  useEffect(() => () => request.current?.abort(), []);

  function edited() {
    setVerdict(null);
    setError("");
  }

  async function checkAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    const normalized = numericAnswer.trim().replace(",", ".");
    if (isNumeric && !/^[+-]?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/.test(normalized)) {
      setError("Введите число, например −12,5. Используйте обычный минус (-), точку или запятую.");
      return;
    }
    if (!isNumeric && selected.length === 0) {
      setError("Выберите хотя бы один вариант ответа.");
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setVerdict(null);
    try {
      const response = await submitAnswer(task.id, isNumeric
        ? { numericAnswer: normalized }
        : { selectedOptionIndexes: selected }, controller.signal);
      if (controller.signal.aborted) return;
      if (response.status !== "FINISHED" || (response.verdict !== "AC" && response.verdict !== "WA")) {
        throw new Error("Не удалось получить результат. Попробуйте ещё раз.");
      }
      setVerdict(response.verdict === "AC" ? "AC" : "WA");
      if (response.verdict === "AC") {
        onAccepted(task.id);
        window.dispatchEvent(new Event("qlc:learning-updated"));
      }
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(failure instanceof Error ? failure.message : "Не удалось проверить ответ. Попробуйте ещё раз.");
      }
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  return <section className="border border-line bg-surface p-5 sm:p-6" aria-label="Проверка ответа">
    <form onSubmit={checkAnswer} className="grid gap-5">
      <fieldset disabled={busy} className="min-w-0">
        <legend className="mb-2 text-lg font-semibold">{isNumeric ? "Ваш ответ" : multiple ? "Выберите все верные варианты" : "Выберите один вариант"}</legend>
        {isNumeric ? <div className="grid max-w-md gap-2">
          <input id={numericId} type="text" inputMode="decimal" autoComplete="off" maxLength={256} aria-label="Ответ"
            value={numericAnswer} aria-describedby={`${numericId}-hint`} aria-invalid={Boolean(error)}
            className="min-h-12 w-full rounded-sm border border-[#66705D] bg-ink px-4 py-3 font-mono text-paper outline-none focus:border-acid focus:ring-1 focus:ring-acid disabled:opacity-60"
            placeholder="Например, -12,5" onChange={event => { setNumericAnswer(event.target.value); edited(); }} />
          <p id={`${numericId}-hint`} className="text-sm text-muted">Можно использовать точку или запятую.</p>
        </div> : <div className="grid gap-3">
          {(task.options ?? []).map((option, index) => <label key={index}
            className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-sm border p-4 transition-colors focus-within:ring-2 focus-within:ring-acid ${selected.includes(index) ? "border-acid bg-acid/5" : "border-line hover:border-[#66705D]"} ${busy ? "cursor-wait opacity-60" : ""}`}>
            <input type={multiple ? "checkbox" : "radio"} name={`answer-${task.id}`} value={index}
              className="mt-1 h-4 w-4 shrink-0 accent-acid" checked={selected.includes(index)}
              onChange={event => {
                setSelected(previous => multiple
                  ? event.target.checked ? [...previous, index] : previous.filter(value => value !== index)
                  : [index]);
                edited();
              }} />
            <span className="min-w-0 whitespace-pre-wrap break-words text-sm leading-6">{option}</span>
          </label>)}
        </div>}
      </fieldset>
      <div><Button type="submit" loading={busy} disabled={isNumeric ? !numericAnswer.trim() : selected.length === 0}>
        {busy ? "Проверяем…" : "Проверить"}
      </Button></div>
      {error && <Alert title="Не удалось проверить ответ" tone="danger">{error}</Alert>}
      {verdict && <Alert title={verdict === "AC" ? "Верно" : "Неверно"} tone={verdict === "AC" ? "success" : "warning"}>
        {verdict === "AC" ? "Ответ принят. Прогресс сохранён." : "Попробуйте ещё раз. Можно вернуться к материалу урока."}
      </Alert>}
    </form>
  </section>;
}
