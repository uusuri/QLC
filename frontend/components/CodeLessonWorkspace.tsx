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
  getAuthChangeEventName,
  getCurrentUser,
  getSubmission
} from "@/services/api";

// UI-kit компоненты фиксируют общий визуальный язык Sprint 2.
import {
  Alert,
  Button,
  ButtonLink,
  Panel,
  PanelBody,
  PanelHeader,
  StatusBadge
} from "@/components/ui";

// Типы backend DTO и submission response.
import type { AuthUserDto, LearnerTaskDto, SubmissionResponseDto } from "@/types";

// Monaco загружается client-only, чтобы production build не падал на SSR.
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  loading: () => (
    <div className="grid min-h-[420px] place-items-center border border-line bg-ink text-xs font-black uppercase text-white/40">
      Loading editor
    </div>
  ),
  ssr: false
});

function defineQlcMonacoTheme(monaco: Monaco) {
  monaco.editor.defineTheme("qlc-night", {
    base: "vs-dark",
    inherit: true,
    colors: {
      "editor.background": "#0b0d0f",
      "editor.foreground": "#e8ece8",
      "editorCursor.foreground": "#b8ff35",
      "editor.lineHighlightBackground": "#111714",
      "editorLineNumber.activeForeground": "#b8ff35",
      "editorLineNumber.foreground": "#4b574d",
      "editor.selectionBackground": "#314615",
      "editor.inactiveSelectionBackground": "#222f14",
      "editorIndentGuide.background1": "#202a22",
      "editorIndentGuide.activeBackground1": "#4d6c23"
    },
    rules: [
      { token: "comment", foreground: "6f8174" },
      { token: "keyword", foreground: "b8ff35" },
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

// Ключ localStorage для завершенных уроков Sprint 2.
const COMPLETED_LESSONS_KEY = "qlc:completed-lessons";

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
  // errorMessage хранит сетевую/API ошибку.
  errorMessage?: string;
  // phase управляет статусом и disabled-состояниями.
  phase: SubmissionPhase;
  // response — последний ответ GET /api/submissions/{id}.
  response?: SubmissionResponseDto;
  // submissionId нужен для отображения и resume polling.
  submissionId?: string;
};

// Props workspace.
type CodeLessonWorkspaceProps = {
  // lessonId нужен для локальной отметки completed.
  lessonId: number;
  // task — основная CODE-задача урока.
  task: LearnerTaskDto;
};

// Проверяет AbortError без any.
function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

// Достает читаемый текст ошибки.
function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Network/API error";
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
      badge: "submitting",
      description: "Отправляем исходник в backend.",
      title: "Submitting",
      tone: "info" as const
    };
  }

  if (phase === "queued") {
    return {
      badge: "queued",
      description: "Submission принят и ждет worker.",
      title: "Queued",
      tone: "warning" as const
    };
  }

  if (phase === "compiling") {
    return {
      badge: "compiling",
      description: "Worker компилирует исходный код.",
      title: "Compiling",
      tone: "info" as const
    };
  }

  if (phase === "running") {
    return {
      badge: "running",
      description: "Worker запускает скомпилированное решение на тестах.",
      title: "Running tests",
      tone: "info" as const
    };
  }

  if (phase === "ac") {
    return {
      badge: "AC",
      description: "Accepted. Урок отмечен завершенным локально для Sprint 2.",
      title: "Accepted",
      tone: "success" as const
    };
  }

  if (phase === "wa") {
    return {
      badge: "WA",
      description: "Wrong Answer. Исправьте код и отправьте снова.",
      title: "Wrong answer",
      tone: "warning" as const
    };
  }

  if (phase === "ce") {
    return {
      badge: "CE",
      description: "Compilation Error. Ниже показан ограниченный безопасный log.",
      title: "Compilation error",
      tone: "danger" as const
    };
  }

  if (phase === "tle") {
    return {
      badge: "TLE",
      description: "Time Limit Exceeded. Решение слишком медленное.",
      title: "Time limit",
      tone: "warning" as const
    };
  }

  if (phase === "mle") {
    return {
      badge: "MLE",
      description: "Memory Limit Exceeded. Решение использует слишком много памяти.",
      title: "Memory limit",
      tone: "warning" as const
    };
  }

  if (phase === "re") {
    return {
      badge: "RE",
      description: "Runtime Error. Программа упала во время выполнения.",
      title: "Runtime error",
      tone: "danger" as const
    };
  }

  if (phase === "ole") {
    return {
      badge: "OLE",
      description: "Output Limit Exceeded. Программа выводит слишком много данных.",
      title: "Output limit",
      tone: "warning" as const
    };
  }

  if (phase === "network") {
    return {
      badge: "network",
      description: "Сеть или API недоступны. Это не student Runtime Error.",
      title: "Network/API error",
      tone: "danger" as const
    };
  }

  if (phase === "infra") {
    return {
      badge: "infra",
      description: "Backend вернул INFRA_ERROR без student verdict.",
      title: "Infrastructure error",
      tone: "danger" as const
    };
  }

  if (phase === "cancelled") {
    return {
      badge: "cancelled",
      description: "Проверка была отменена backend или worker.",
      title: "Submission cancelled",
      tone: "warning" as const
    };
  }

  if (phase === "unknown") {
    return {
      badge: "unknown",
      description: "Backend вернул неизвестный статус. UI не скрывает это состояние.",
      title: "Unknown backend status",
      tone: "warning" as const
    };
  }

  return {
    badge: "idle",
    description: "Напишите решение и отправьте на проверку.",
    title: "Ready",
    tone: "neutral" as const
  };
}

// Ограничивает compiler log/safeMessage, чтобы UI не раздувался.
function limitLog(message: string) {
  return message.length > 1200 ? `${message.slice(0, 1200)}\n... log truncated` : message;
}

// Читает массив completed lessons из localStorage.
function readCompletedLessons() {
  try {
    const raw = window.localStorage.getItem(COMPLETED_LESSONS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is number => typeof item === "number")
      : [];
  } catch {
    return [];
  }
}

// CodeLessonWorkspace объединяет editor и submission lifecycle.
export function CodeLessonWorkspace({ lessonId, task }: CodeLessonWorkspaceProps) {
  const taskVersion = task.testSetVersion ?? 1;
  const draftKey = `qlc:draft:task:${task.id}:v${taskVersion}`;
  const lastSubmissionKey = `qlc:last-submission:task:${task.id}:v${taskVersion}`;
  const initialCode = useMemo(() => getInitialCode(task), [task]);
  const [authUser, setAuthUser] = useState<AuthUserDto | null>(null);
  const [currentPath, setCurrentPath] = useState("/");
  const [source, setSource] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [submission, setSubmission] = useState<SubmissionUiState>({ phase: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const sourceSize = getSourceSize(source);
  const language = task.language ?? "CPP23";
  const trimmedSource = source.trim();
  const phaseCopy = getPhaseCopy(submission.phase);
  const isBusy = ["submitting", "queued", "compiling", "running"].includes(submission.phase);
  const sourceTooLarge = sourceSize > MAX_SOURCE_SIZE;
  const canSubmit = Boolean(authUser) && trimmedSource.length > 0 && !sourceTooLarge && !isBusy;
  const safeLog = submission.response?.safeMessage ?? submission.errorMessage ?? "";
  const loginHref = `/login?redirectTo=${encodeURIComponent(currentPath)}`;

  // При смене task один раз загружаем draft или backend starterCode/templateCode.
  useEffect(() => {
    const savedDraft = window.localStorage.getItem(draftKey);
    const savedSubmissionId = window.localStorage.getItem(lastSubmissionKey);
    const completedLessons = readCompletedLessons();

    setSource(savedDraft ?? initialCode);
    setLastSubmissionId(savedSubmissionId);
    setCompleted(completedLessons.includes(lessonId));
    setSubmission({ phase: "idle", submissionId: savedSubmissionId ?? undefined });
    setDraftLoaded(true);
  }, [draftKey, initialCode, lastSubmissionKey, lessonId]);

  // Восстанавливает auth state и реагирует на login/logout в других компонентах.
  useEffect(() => {
    const refreshAuth = () => {
      setCurrentPath(`${window.location.pathname}${window.location.search}`);
      void getCurrentUser().then(setAuthUser);
    };

    refreshAuth();

    window.addEventListener("storage", refreshAuth);
    window.addEventListener(getAuthChangeEventName(), refreshAuth);

    return () => {
      window.removeEventListener("storage", refreshAuth);
      window.removeEventListener(getAuthChangeEventName(), refreshAuth);
    };
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

  // Отмечает урок завершенным в локальном состоянии Sprint 2.
  const markLessonCompleted = useCallback(() => {
    const completedLessons = readCompletedLessons();

    if (!completedLessons.includes(lessonId)) {
      window.localStorage.setItem(
        COMPLETED_LESSONS_KEY,
        JSON.stringify([...completedLessons, lessonId])
      );
    }

    setCompleted(true);
  }, [lessonId]);

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

          if (nextPhase === "ac") {
            markLessonCompleted();
          }

          if (!isTerminalPhase(nextPhase)) {
            timeoutRef.current = window.setTimeout(tick, POLLING_INTERVAL_MS);
          }
        } catch (error) {
          if (isAbortError(error)) {
            return;
          }

          setSubmission({
            errorMessage: getErrorMessage(error),
            phase: "network",
            submissionId
          });
        }
      };

      void tick();
    },
    [markLessonCompleted]
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
        errorMessage: getErrorMessage(error),
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
    setSource(initialCode);
    window.localStorage.setItem(draftKey, initialCode);
  };

  return (
    <Panel className="flex h-full min-h-0 flex-col overflow-hidden" muted>
      <PanelHeader>
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            {submission.phase !== "idle" && (
              <StatusBadge tone={phaseCopy.tone}>{phaseCopy.badge}</StatusBadge>
            )}
            {completed && <StatusBadge tone="success">lesson completed</StatusBadge>}
            <StatusBadge tone="neutral">{language === "JAVA21" ? "Java 21" : "C++23"}</StatusBadge>
            {authUser ? (
              <StatusBadge tone="success">@{authUser.username}</StatusBadge>
            ) : (
              <StatusBadge tone="warning">login required</StatusBadge>
            )}
          </div>
          <h2 className="text-3xl font-black uppercase leading-tight">Решение задачи</h2>
          <p className="mt-3 max-w-3xl text-sm leading-snug text-white/56">
            Черновик сохраняется автоматически.
          </p>
        </div>
      </PanelHeader>

      <PanelBody className="flex min-h-0 flex-1 flex-col gap-5">
        <div className="min-h-[420px] flex-1 overflow-hidden border border-line">
          <MonacoEditor
            beforeMount={defineQlcMonacoTheme}
            height="100%"
            language={language === "JAVA21" ? "java" : "cpp"}
            onChange={(value) => setSource(value ?? "")}
            options={{
              fontFamily: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              tabSize: 2,
              wordWrap: "on"
            }}
            theme="qlc-night"
            value={source}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="grid gap-2 text-xs font-bold uppercase text-white/48">
            <span>
              Размер кода: {sourceSize} / {MAX_SOURCE_SIZE} байт
            </span>
            {!authUser && (
              <span className="text-yellow-100">Чтобы отправить решение, войдите в аккаунт.</span>
            )}
            {sourceTooLarge && <span className="text-red-200">Source is too large</span>}
            {!trimmedSource && <span className="text-yellow-100">Source cannot be empty</span>}
          </div>

          <div className="flex flex-wrap gap-3">
            {authUser ? (
              <Button
                disabled={!canSubmit}
                loading={submission.phase === "submitting"}
                onClick={handleSubmit}
              >
                Отправить
              </Button>
            ) : (
              <ButtonLink href={loginHref}>Войти</ButtonLink>
            )}
            <Button disabled={!authUser || !lastSubmissionId || isBusy} onClick={handleResume} variant="secondary">
              Обновить статус
            </Button>
            <Button disabled={isBusy} onClick={handleResetDraft} variant="secondary">
              Сбросить код
            </Button>
          </div>
        </div>

        {!authUser && (
          <Alert title="auth required" tone="warning">
            Чтобы отправить решение, войдите в аккаунт. Submission request body останется без
            `userId`; frontend добавит только `Authorization: Bearer token`.
          </Alert>
        )}

        {submission.phase !== "idle" && (
          <Alert title={phaseCopy.title} tone={phaseCopy.tone}>
            <p>{phaseCopy.description}</p>
            {submission.response && (
              <p className="mt-2 font-mono text-xs text-white/50">
                status={submission.response.status}
                {submission.response.verdict ? ` verdict=${submission.response.verdict}` : ""}
                {submission.response.executionTime !== null
                  ? ` time=${submission.response.executionTime}ms`
                  : ""}
                {submission.response.memoryUsed !== null
                  ? ` memory=${submission.response.memoryUsed}`
                  : ""}
              </p>
            )}
          </Alert>
        )}

        {safeLog && (
          <pre className="max-h-64 overflow-auto border border-line bg-ink p-4 text-xs leading-relaxed text-white/72">
            <code>{limitLog(safeLog)}</code>
          </pre>
        )}
      </PanelBody>
    </Panel>
  );
}
