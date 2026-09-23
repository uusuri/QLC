// Компонент выполняется в браузере: Monaco, localStorage и polling требуют client runtime.
"use client";

// dynamic нужен, чтобы Monaco не пытался рендериться на сервере.
import dynamic from "next/dynamic";
import type { Monaco } from "@monaco-editor/react";

// React-хуки держат draft, lifecycle submission и cleanup polling.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// API-запросы идут только через service layer.
import {
  createSubmission,
  getSubmission
} from "@/services/api";

import { useAuth } from "@/components/AuthProvider";

// UI-kit компоненты фиксируют общий визуальный язык Sprint 2.
import {
  Alert,
  Button,
  ButtonLink,
  Panel,
  PanelBody,
  PanelHeader
} from "@/components/ui";

// Типы backend DTO и submission response.
import type { LearnerTaskDto, SubmissionResponseDto } from "@/types";

// Monaco загружается client-only, чтобы production build не падал на SSR.
// Локальная сборка редактора не зависит от доступности внешнего CDN.
const MonacoEditor = dynamic(async () => {
  const [{ default: Editor, loader }, monaco] = await Promise.all([
    import("@monaco-editor/react"),
    import("monaco-editor/esm/vs/editor/editor.api.js")
  ]);
  const editorWindow = window as Window & {
    MonacoEnvironment?: { getWorker: () => Worker };
  };
  editorWindow.MonacoEnvironment = {
    getWorker: () => new Worker(
      new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url),
      { type: "module", name: "qlc-editor" }
    )
  };
  await Promise.all([
    import("monaco-editor/esm/vs/basic-languages/java/java.contribution.js"),
    import("monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution.js")
  ]);
  loader.config({ monaco });
  return Editor;
}, {
  loading: () => (
    <div className="grid min-h-[340px] place-items-center border border-line bg-ink text-sm text-white/52 sm:min-h-[420px]">
      Загружаем редактор
    </div>
  ),
  ssr: false
});

function defineQlcMonacoTheme(monaco: Monaco) {
  monaco.editor.defineTheme("qlc-night", {
    base: "vs-dark",
    inherit: true,
    colors: {
      "editor.background": "#0a0a0a",
      "editor.foreground": "#e8ece8",
      "editorCursor.foreground": "#c4ff00",
      "editor.lineHighlightBackground": "#171a10",
      "editorLineNumber.activeForeground": "#c4ff00",
      "editorLineNumber.foreground": "#89968d",
      "editor.selectionBackground": "#314615",
      "editor.inactiveSelectionBackground": "#222f14",
      "editorIndentGuide.background1": "#202a22",
      "editorIndentGuide.activeBackground1": "#4d6c23"
    },
    rules: [
      { token: "comment", foreground: "89968d" },
      { token: "keyword", foreground: "c4ff00" },
      { token: "string", foreground: "f6c177" },
      { token: "number", foreground: "8bd5ca" },
      { token: "type.identifier", foreground: "8aadf4" },
      { token: "identifier", foreground: "e8ece8" },
      { token: "delimiter", foreground: "bac5bb" }
    ]
  });
}

// Максимальный размер source до отправки, синхронизирован с backend default.
const MAX_SOURCE_SIZE = 65_535;

// Интервал polling в рамках требования 500-1000 мс.
const POLLING_INTERVAL_MS = 800;

// Фазы UI submission lifecycle.
type SubmissionPhase =
  | "idle"
  | "submitting"
  | "queued"
  | "compiling"
  | "running"
  | "ac"
  | "wa"
  | "ce"
  | "tle"
  | "mle"
  | "re"
  | "ole"
  | "network"
  | "infra"
  | "cancelled"
  | "unknown";

// Локальное состояние submission UI.
type SubmissionUiState = {
  // phase управляет статусом и disabled-состояниями.
  phase: SubmissionPhase;
  // response — последний ответ GET /api/submissions/{id}.
  response?: SubmissionResponseDto;
  // submissionId нужен для отображения и resume polling.
  submissionId?: string;
};

// Props workspace.
type CodeLessonWorkspaceProps = {
  // task — основная CODE-задача урока.
  task: LearnerTaskDto;
  onSubmissionStart?: () => void;
};

// Проверяет AbortError без any.
function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

// Возвращает размер исходника в байтах, если среда поддерживает Blob.
function getSourceSize(source: string) {
  if (typeof Blob !== "undefined") {
    return new Blob([source]).size;
  }

  return source.length;
}

// Возвращает starterCode из актуального TaskDTO, затем legacy templateCode или шаблон языка задачи.
function getInitialCode(task: LearnerTaskDto) {
  const language = task.language ?? "CPP23";

  return (
    task.starterCode ||
    task.templateCode ||
    (language === "JAVA21"
      ? `public class Main {
    public static void main(String[] args) {
        
    }
}
`
      : `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    return 0;
}
`)
  );
}

// Сопоставляет актуальный короткий verdict и legacy alias с UI-фазой.
function getVerdictPhase(verdict: SubmissionResponseDto["verdict"]): SubmissionPhase {
  if (verdict === "AC" || verdict === "ACCEPTED") {
    return "ac";
  }

  if (verdict === "WA" || verdict === "WRONG_ANSWER") {
    return "wa";
  }

  if (verdict === "CE" || verdict === "COMPILATION_ERROR") {
    return "ce";
  }

  if (verdict === "TLE" || verdict === "TIME_LIMIT_EXCEEDED") {
    return "tle";
  }

  if (verdict === "MLE" || verdict === "MEMORY_LIMIT_EXCEEDED") {
    return "mle";
  }

  if (verdict === "RE" || verdict === "RUNTIME_ERROR") {
    return "re";
  }

  if (verdict === "OLE" || verdict === "OUTPUT_LIMIT_EXCEEDED") {
    return "ole";
  }

  return "unknown";
}

// Сопоставляет новый worker lifecycle и временные legacy statuses с UI-фазой.
function getPhaseFromResponse(response: SubmissionResponseDto): SubmissionPhase {
  if (response.status === "QUEUED") {
    return "queued";
  }

  if (response.status === "COMPILING") {
    return "compiling";
  }

  if (response.status === "RUNNING") {
    return "running";
  }

  if (response.status === "INFRA_ERROR" || response.status === "FAILED") {
    return "infra";
  }

  if (response.status === "CANCELLED") {
    return "cancelled";
  }

  if (response.status === "FINISHED" || response.status === "COMPLETED") {
    return getVerdictPhase(response.verdict);
  }

  return "unknown";
}

// Created response не содержит verdict; non-terminal worker status можно показать сразу.
function getCreatedPhase(status: SubmissionResponseDto["status"]): SubmissionPhase {
  if (status === "COMPILING") {
    return "compiling";
  }

  if (status === "RUNNING") {
    return "running";
  }

  if (status === "INFRA_ERROR" || status === "FAILED") {
    return "infra";
  }

  if (status === "CANCELLED") {
    return "cancelled";
  }

  // QUEUED — штатный create response. FINISHED/unknown сразу уточняются первым poll.
  return "queued";
}

// Определяет, нужно ли продолжать polling.
function isTerminalPhase(phase: SubmissionPhase) {
  return [
    "ac",
    "wa",
    "ce",
    "tle",
    "mle",
    "re",
    "ole",
    "network",
    "infra",
    "cancelled",
    "unknown"
  ].includes(phase);
}

// Возвращает тексты и тон статуса.
function getPhaseCopy(phase: SubmissionPhase) {
  if (phase === "submitting") {
    return {
      badge: "Отправка",
      description: "Передаём решение на проверку.",
      title: "Отправляем решение",
      tone: "info" as const
    };
  }

  if (phase === "queued") {
    return {
      badge: "В очереди",
      description: "Решение принято и ждёт своей очереди на проверку.",
      title: "Решение в очереди",
      tone: "warning" as const
    };
  }

  if (phase === "compiling") {
    return {
      badge: "Компиляция",
      description: "Компилируем исходный код.",
      title: "Компилируем решение",
      tone: "info" as const
    };
  }

  if (phase === "running") {
    return {
      badge: "Тесты",
      description: "Запускаем решение на тестах.",
      title: "Проверяем на тестах",
      tone: "info" as const
    };
  }

  if (phase === "ac") {
    return {
      badge: "AC",
      description: "Все тесты пройдены.",
      title: "Решение принято",
      tone: "success" as const
    };
  }

  if (phase === "wa") {
    return {
      badge: "WA",
      description: "Ответ не прошёл один или несколько тестов. Исправьте код и отправьте снова.",
      title: "Неверный ответ",
      tone: "warning" as const
    };
  }

  if (phase === "ce") {
    return {
      badge: "CE",
      description: "Код не скомпилировался. Ниже показан безопасный фрагмент сообщения компилятора.",
      title: "Ошибка компиляции",
      tone: "danger" as const
    };
  }

  if (phase === "tle") {
    return {
      badge: "TLE",
      description: "Решение работает дольше допустимого времени.",
      title: "Превышено время",
      tone: "warning" as const
    };
  }

  if (phase === "mle") {
    return {
      badge: "MLE",
      description: "Решение использует больше памяти, чем разрешено.",
      title: "Превышена память",
      tone: "warning" as const
    };
  }

  if (phase === "re") {
    return {
      badge: "RE",
      description: "Программа завершилась с ошибкой во время выполнения.",
      title: "Ошибка выполнения",
      tone: "danger" as const
    };
  }

  if (phase === "ole") {
    return {
      badge: "OLE",
      description: "Программа вывела больше данных, чем разрешено.",
      title: "Превышен объём вывода",
      tone: "warning" as const
    };
  }

  if (phase === "network") {
    return {
      badge: "Сеть",
      description: "Не удалось связаться с сервером. Код можно не менять — попробуйте отправить ещё раз.",
      title: "Нет связи с сервером",
      tone: "danger" as const
    };
  }

  if (phase === "infra") {
    return {
      badge: "Сервис",
      description: "Сервис проверки временно недоступен. Попробуйте повторить отправку позже.",
      title: "Ошибка сервиса проверки",
      tone: "danger" as const
    };
  }

  if (phase === "cancelled") {
    return {
      badge: "Отменено",
      description: "Проверка решения была отменена. Отправьте его ещё раз.",
      title: "Проверка отменена",
      tone: "warning" as const
    };
  }

  if (phase === "unknown") {
    return {
      badge: "Неизвестно",
      description: "Сервер вернул неизвестный статус. Попробуйте обновить результат.",
      title: "Неизвестный статус",
      tone: "warning" as const
    };
  }

  return {
    badge: "Готово",
    description: "Напишите решение и отправьте на проверку.",
    title: "Можно отправлять",
    tone: "neutral" as const
  };
}

function isValidMetric(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function formatMemory(memoryUsedKb: number | null | undefined) {
  if (!isValidMetric(memoryUsedKb)) {
    return null;
  }

  if (memoryUsedKb < 1024) {
    return `${memoryUsedKb.toLocaleString("ru-RU")} КБ`;
  }

  return `${(memoryUsedKb / 1024).toLocaleString("ru-RU", {
    maximumFractionDigits: 1
  })} МБ`;
}

function formatResultSummary(response: SubmissionResponseDto, verdict: string) {
  if (verdict === "CE") {
    return verdict;
  }

  const parts = [verdict];

  if (isValidMetric(response.executionTime)) {
    parts.push(`Время ${response.executionTime.toLocaleString("ru-RU")} мс`);
  }

  const memory = formatMemory(response.memoryUsed);
  if (memory !== null) {
    parts.push(`Память ${memory}`);
  }

  return parts.join(" / ");
}

// CodeLessonWorkspace объединяет editor и submission lifecycle.
export function CodeLessonWorkspace({ task, onSubmissionStart }: CodeLessonWorkspaceProps) {
  const { user: authUser } = useAuth();
  const taskVersion = task.testSetVersion ?? 1;
  const draftKey = `qlc:draft:task:${task.id}:v${taskVersion}`;
  const lastSubmissionKey = `qlc:last-submission:task:${task.id}:v${taskVersion}`;
  const initialCode = useMemo(() => getInitialCode(task), [task]);
  const [currentPath, setCurrentPath] = useState("/");
  const [source, setSource] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);
  const [submission, setSubmission] = useState<SubmissionUiState>({ phase: "idle" });
  const resetDialogRef = useRef<HTMLDialogElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const sourceSize = getSourceSize(source);
  const language = task.language ?? "CPP23";
  const trimmedSource = source.trim();
  const phaseCopy = getPhaseCopy(submission.phase);
  const isBusy = ["submitting", "queued", "compiling", "running"].includes(submission.phase);
  const sourceTooLarge = sourceSize > MAX_SOURCE_SIZE;
  const canSubmit = Boolean(authUser) && trimmedSource.length > 0 && !sourceTooLarge && !isBusy;
  const resultSummary = submission.response?.verdict
    ? formatResultSummary(submission.response, phaseCopy.badge)
    : null;
  const loginHref = `/login?redirectTo=${encodeURIComponent(currentPath)}`;
  const fileName = language === "JAVA21" ? "Main.java" : "main.cpp";

  // При смене task один раз загружаем draft или backend starterCode/templateCode.
  useEffect(() => {
    const savedDraft = window.localStorage.getItem(draftKey);
    const savedSubmissionId = window.localStorage.getItem(lastSubmissionKey);

    setSource(savedDraft ?? initialCode);
    setLastSubmissionId(savedSubmissionId);
    setSubmission({ phase: "idle", submissionId: savedSubmissionId ?? undefined });
    setDraftLoaded(true);
  }, [draftKey, initialCode, lastSubmissionKey]);

  // Текущий URL нужен только для безопасного возврата после входа.
  useEffect(() => {
    setCurrentPath(`${window.location.pathname}${window.location.search}`);
  }, []);

  // После первой загрузки сохраняем draft при каждом изменении исходника.
  useEffect(() => {
    if (draftLoaded) {
      window.localStorage.setItem(draftKey, source);
    }
  }, [draftKey, draftLoaded, source]);

  // Cleanup: останавливаем polling и abort при unmount.
  useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      abortRef.current?.abort();
    },
    []
  );

  // Останавливает предыдущий polling перед новым submit/resume.
  const stopPolling = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // Запускает polling известного submission ID.
  const pollSubmission = useCallback(
    (submissionId: string, controller: AbortController) => {
      const tick = async () => {
        try {
          const response = await getSubmission(submissionId, controller.signal);
          const nextPhase = getPhaseFromResponse(response);

          setSubmission({
            phase: nextPhase,
            response,
            submissionId
          });

          if (response.verdict === "AC") {
            window.dispatchEvent(new Event("qlc:learning-updated"));
          }

          if (!isTerminalPhase(nextPhase)) {
            timeoutRef.current = window.setTimeout(tick, POLLING_INTERVAL_MS);
          }
        } catch (error) {
          if (isAbortError(error)) {
            return;
          }

          setSubmission({
            phase: "network",
            submissionId
          });
        }
      };

      void tick();
    },
    []
  );

  // Отправляет текущее решение.
  const handleSubmit = async () => {
    if (!authUser) {
      return;
    }

    if (!canSubmit) {
      return;
    }

    stopPolling();
    const controller = new AbortController();
    abortRef.current = controller;
    setSubmission({ phase: "submitting" });
    onSubmissionStart?.();

    try {
      const created = await createSubmission(
        task.id,
        {
          language,
          sourceCode: source
        },
        controller.signal
      );

      window.localStorage.setItem(lastSubmissionKey, created.id);
      setLastSubmissionId(created.id);
      setSubmission({
        phase: getCreatedPhase(created.status),
        submissionId: created.id
      });
      pollSubmission(created.id, controller);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      setSubmission({
        phase: "network"
      });
    }
  };

  // Возобновляет polling последнего известного submission после refresh.
  const handleResume = () => {
    if (!lastSubmissionId || isBusy) {
      return;
    }

    stopPolling();
    const controller = new AbortController();
    abortRef.current = controller;
    setSubmission({
      phase: "queued",
      submissionId: lastSubmissionId
    });
    pollSubmission(lastSubmissionId, controller);
  };

  // Сбрасывает editor к backend starterCode/templateCode.
  const handleResetDraft = () => {
    resetDialogRef.current?.close();
    setSource(initialCode);
    window.localStorage.setItem(draftKey, initialCode);
  };

  return <div className="kit-workspace grid min-w-0 gap-6">
    <Panel className="kit-editor-panel">
      <PanelHeader><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl">Ваше решение</h2><span className="font-mono text-xs text-muted">{language === "JAVA21" ? "Java 21" : "C++23"} · {fileName}</span></div><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted">Черновик сохраняется на этом устройстве</p><button className="min-h-11 text-xs text-muted hover:text-paper" disabled={isBusy} onClick={() => resetDialogRef.current?.showModal()} type="button">Сбросить код</button></div></PanelHeader>
      <PanelBody className="!pt-0">
        <div className="h-[50dvh] min-h-[340px] max-h-[640px] min-w-0 overflow-hidden rounded-sm border border-line sm:h-[480px]">
          <MonacoEditor beforeMount={defineQlcMonacoTheme} height="100%" language={language === "JAVA21" ? "java" : "cpp"} loading={<span className="text-sm text-muted">Подготавливаем редактор…</span>} onChange={value => setSource(value ?? "")} options={{ ariaLabel:"Редактор решения задачи", automaticLayout:true, fontFamily:"IBM Plex Mono, Menlo, monospace", fontSize:14, lineHeight:23, minimap:{enabled:false}, padding:{bottom:18,top:18}, scrollBeyondLastLine:false, tabSize:2, wordWrap:"on" }} theme="qlc-night" value={source} />
        </div>
        <p className="mt-4 text-xs text-muted">{sourceSize.toLocaleString("ru-RU")} / {MAX_SOURCE_SIZE.toLocaleString("ru-RU")} байт</p>
        {sourceTooLarge && <p className="mt-2 text-sm text-[#FF8074]" role="alert">Код превышает допустимый размер.</p>}
        {!trimmedSource && <p className="mt-2 text-xs text-muted">Введите решение перед отправкой.</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-5">{authUser ? <Button disabled={!canSubmit} loading={submission.phase === "submitting"} onClick={handleSubmit}>{isBusy ? "Проверяем решение" : "Проверить решение"} →</Button> : <ButtonLink href={loginHref}>Войти и отправить решение →</ButtonLink>}<Button disabled={!authUser || !lastSubmissionId || isBusy} onClick={handleResume} variant="secondary">Обновить статус</Button></div>
        <p className="mt-5 text-xs text-muted">Проверка решения не удаляет черновик.</p>
      </PanelBody>
    </Panel>
    <section className="kit-result-panel grid min-w-0 gap-4" aria-label="Результат проверки">
      {!authUser && <Alert title="Войдите для проверки" tone="warning">Редактор доступен сейчас. Войдите в аккаунт, чтобы отправить решение и сохранить результат.</Alert>}
      <Alert title={phaseCopy.title} tone={phaseCopy.tone}>{resultSummary ? <p className="font-mono text-xs text-muted sm:text-sm">{resultSummary}</p> : <p>{phaseCopy.description}</p>}
      {submission.phase === "network" && <Button className="mt-4" variant="secondary" disabled={!authUser || !lastSubmissionId || isBusy} onClick={handleResume}>Обновить статус</Button>}</Alert>
    </section>
    <dialog className="kit-dialog" ref={resetDialogRef}><h2>Сбросить код?</h2><p>Текущий черновик будет заменён стартовым кодом задачи. Это действие нельзя отменить.</p><div className="flex flex-wrap gap-3"><Button autoFocus onClick={() => resetDialogRef.current?.close()} variant="secondary">Сохранить черновик</Button><Button onClick={handleResetDraft} variant="danger">Сбросить код</Button></div></dialog>
  </div>;
}
