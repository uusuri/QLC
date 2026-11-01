"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui";
import { createCodeRun, getCodeRun } from "@/services/api";
import { MAX_RUN_TESTS, publicExampleTests, runStatusLabel, runTestsError, type CodeRunResult, type RunTest } from "@/services/codeRuns";
import type { SubmissionLanguage } from "@/types";

type Test = RunTest & { label: string; id: number };
type Props = { taskId: number; statement: string; language: SubmissionLanguage; source: string;
  disabled: boolean; children: ReactNode };

export function CodeRunPanel({ taskId, statement, language, source, disabled, children }: Props) {
  const [tests, setTests] = useState<Test[]>(() => {
    const examples = publicExampleTests(statement);
    return examples.length ? examples.map((test, id) => ({ ...test, id, label: `Пример ${id + 1}` }))
      : [{ id: 0, label: "Тест 1", input: "", output: null }];
  });
  const nextId = useRef(tests.length);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CodeRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentSource, setSentSource] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = tests[selected];
  const testResult = result?.tests[selected];
  const validation = runTestsError(tests);

  useEffect(() => () => {
    request.current?.abort();
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const update = (change: Partial<RunTest>) => {
    setTests(previous => previous.map((test, index) => index === selected ? { ...test, ...change } : test));
    setResult(null);
    setError(null);
  };

  const run = async () => {
    if (busy || disabled || validation || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(null);
    setResult(null);
    setSentSource(source);
    const deadline = Date.now() + 370_000;
    const fail = (reason: unknown) => {
      if (controller.signal.aborted) return;
      setError(reason instanceof Error ? reason.message : "Не удалось получить результат запуска.");
      setBusy(false);
      request.current = null;
    };
    const receive = (value: CodeRunResult) => {
      if (controller.signal.aborted) return;
      setResult(value);
      if (value.status === "FINISHED" || value.status === "ERROR") {
        setBusy(false);
        request.current = null;
      } else if (Date.now() > deadline) {
        fail(new Error("Время ожидания истекло. Попробуйте ещё раз."));
      } else {
        timer.current = setTimeout(() => {
          void getCodeRun(value.id, controller.signal).then(receive).catch(fail);
        }, 700);
      }
    };
    try {
      receive(await createCodeRun(taskId, { language, sourceCode: source,
        tests: tests.map(({ input, output }) => ({ input, output })) }, controller.signal));
    } catch (reason) { fail(reason); }
  };

  return <>
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-5">
      <Button variant="secondary" disabled={disabled || busy || Boolean(validation)} onClick={run}>
        {busy ? result?.status === "RUNNING" ? "Выполняется…" : "В очереди…" : "Запустить"}
      </Button>
      {children}
    </div>
    <section className="mt-5 min-w-0 rounded-sm border border-line" aria-label="Пробный запуск">
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-3 py-2" aria-label="Тесты запуска">
        {tests.map((test, index) => <button key={test.id} type="button" aria-pressed={index === selected}
          onClick={() => setSelected(index)} className={`min-h-10 px-3 text-sm ${index === selected ? "text-acid" : "text-muted hover:text-paper"}`}>
          {test.label}{result?.tests[index] && <span className="ml-2" aria-label={runStatusLabel(result.tests[index].status)}>
            {["OK", "AC"].includes(result.tests[index].status) ? "✓" : "!"}</span>}
        </button>)}
        <button type="button" aria-label="Добавить свой тест" title="Добавить свой тест" disabled={busy || tests.length >= MAX_RUN_TESTS}
          className="min-h-10 min-w-10 text-xl text-acid disabled:opacity-30" onClick={() => {
            const id = nextId.current++;
            setTests([...tests, { id, label: `Тест ${id + 1}`, input: "", output: null }]);
            setSelected(tests.length); setResult(null); setError(null);
          }}>+</button>
        <button type="button" aria-label={`Удалить ${active.label.toLowerCase()}`} disabled={busy || tests.length === 1}
          className="ml-auto min-h-10 px-2 text-xs text-muted hover:text-paper disabled:opacity-30" onClick={() => {
            setTests(tests.filter((_, index) => index !== selected));
            setSelected(Math.max(0, selected - 1)); setResult(null); setError(null);
          }}>Удалить</button>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <label className="grid min-w-0 gap-2 text-xs text-muted">Ввод
          <textarea aria-label="Ввод теста" className="h-32 w-full resize-y rounded-sm border border-line bg-ink p-3 font-mono text-sm text-paper"
            value={active.input} disabled={busy} spellCheck={false} maxLength={16384}
            onChange={event => update({ input: event.target.value })} />
        </label>
        <div className="grid min-w-0 gap-2 text-xs text-muted">
          <label className="flex items-center gap-2"><input type="checkbox" checked={active.output !== null} disabled={busy}
            onChange={event => update({ output: event.target.checked ? "" : null })} />Сравнить с ответом</label>
          <textarea aria-label="Ожидаемый ответ" className="h-32 w-full resize-y rounded-sm border border-line bg-ink p-3 font-mono text-sm text-paper disabled:opacity-40"
            value={active.output ?? ""} disabled={busy || active.output === null} spellCheck={false} maxLength={16384}
            placeholder={active.output === null ? "Необязательно" : ""} onChange={event => update({ output: event.target.value })} />
        </div>
      </div>
      <div className="min-h-12 border-t border-line px-4 py-3" aria-live="polite">
        {(error || validation) && <p className="text-sm text-[#FF8074]" role="alert">{error || validation}</p>}
        {sentSource !== null && source !== sentSource && result && <p className="mb-2 text-xs text-muted">Код изменён. Ниже результат предыдущего запуска.</p>}
        {busy && <p className="text-sm text-muted">{result?.status === "RUNNING" ? "Выполняем тесты…" : "Ожидаем запуска…"}</p>}
        {!busy && result?.message && !result.tests.length && <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-sm">{result.message}</pre>}
        {testResult && <>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <span className={["OK", "AC"].includes(testResult.status) ? "text-acid" : "text-[#FFCB66]"}>{runStatusLabel(testResult.status)}</span>
            <span className="text-muted">{testResult.executionTimeMs} мс{testResult.memoryUsedKb != null ? ` / ${testResult.memoryUsedKb.toLocaleString("ru-RU")} КБ` : ""}</span>
          </div>
          {testResult.message && <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{testResult.message}</p>}
          <p className="mt-3 text-xs text-muted">Вывод</p>
          <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-sm">{testResult.stdout || "(пусто)"}</pre>
          {testResult.stderr && <><p className="mt-3 text-xs text-muted">stderr</p><pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words text-sm">{testResult.stderr}</pre></>}
          {testResult.outputTruncated && <p className="mt-2 text-xs text-muted">Вывод сокращён до 16 КБ на поток.</p>}
        </>}
        {!busy && !result && !error && !validation && <p className="text-xs text-muted">Пробный запуск не влияет на прогресс и XP.</p>}
      </div>
    </section>
  </>;
}
