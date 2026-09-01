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
  PanelHeader,
  StatusBadge
} from "@/components/ui";

// Типы backend DTO и submission response.
import type { LearnerTaskDto, SubmissionResponseDto } from "@/types";

// Monaco загружается client-only, чтобы production build не падал на SSR.
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  loading: () => (
    <div className="grid min-h-[340px] place-items-center rounded-2xl border border-line bg-ink text-xs font-black uppercase text-white/52 sm:min-h-[420px]">
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
      description: "Проверяющий вернул AC. Сейчас это тестовый контур: полноценный sandbox ещё не подключён.",
      title: "Результат получен",
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

// Ограничивает compiler log/safeMessage, чтобы UI не раздувался.
function limitLog(message: string) {
  return message.length > 1200 ? `${message.slice(0, 1200)}\n... сообщение сокращено` : message;
}

// CodeLessonWorkspace объединяет editor и submission lifecycle.
export function CodeLessonWorkspace({ task }: CodeLessonWorkspaceProps) {
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
    <Panel className="flex h-full min-h-0 flex-col !overflow-visible" muted>
      <PanelHeader>
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            {submission.phase !== "idle" && (
              <StatusBadge tone={phaseCopy.tone}>{phaseCopy.badge}</StatusBadge>
            )}
            <StatusBadge tone="neutral">{language === "JAVA21" ? "Java 21" : "C++23"}</StatusBadge>
            {authUser ? (
              <StatusBadge className="max-w-full" tone="success"><span className="block max-w-[min(18rem,70vw)] truncate" title={authUser.username}>@{authUser.username}</span></StatusBadge>
            ) : (
              <StatusBadge tone="warning">Нужен вход</StatusBadge>
            )}
          </div>
          <h2 className="text-3xl font-bold leading-tight tracking-[-0.035em]">Решение задачи</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/62">
            Пишите решение в редакторе — черновик сохраняется автоматически.
          </p>
        </div>
      </PanelHeader>

      <PanelBody className="flex min-h-0 flex-1 flex-col gap-5">
        <div className="h-[50dvh] min-h-[340px] max-h-[560px] flex-none overflow-hidden rounded-2xl border border-line sm:h-[520px] sm:min-h-[480px] xl:h-auto xl:max-h-none xl:min-h-[520px] xl:flex-1">
          <MonacoEditor
            beforeMount={defineQlcMonacoTheme}
            height="100%"
            language={language === "JAVA21" ? "java" : "cpp"}
            onChange={(value) => setSource(value ?? "")}
            options={{
              ariaLabel: "Редактор решения задачи",
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

        <div className="sticky bottom-2 z-10 grid gap-3 rounded-2xl border border-white/8 bg-panel/95 p-3 shadow-[0_16px_50px_rgba(0,0,0,0.3)] backdrop-blur xl:static xl:grid-cols-[1fr_auto] xl:items-center xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none">
          <div className="grid gap-2 text-xs font-semibold text-white/58">
            <span>
              Размер кода: {sourceSize} / {MAX_SOURCE_SIZE} байт
            </span>
            {!authUser && (
              <span className="text-yellow-100">Чтобы отправить решение, войдите в аккаунт.</span>
            )}
            {sourceTooLarge && <span className="text-red-200">Код превышает допустимый размер.</span>}
            {!trimmedSource && <span className="text-yellow-100">Введите решение перед отправкой.</span>}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            {authUser ? (
              <Button
                className="col-span-2 w-full sm:w-auto"
                disabled={!canSubmit}
                loading={submission.phase === "submitting"}
                onClick={handleSubmit}
              >
                Отправить
              </Button>
            ) : (
              <ButtonLink className="col-span-2 w-full sm:w-auto" href={loginHref}>Войти</ButtonLink>
            )}
            <Button className="w-full sm:w-auto" disabled={!authUser || !lastSubmissionId || isBusy} onClick={handleResume} variant="secondary">
              Обновить статус
            </Button>
            <Button className="w-full sm:w-auto" disabled={isBusy} onClick={handleResetDraft} variant="secondary">
              Сбросить код
            </Button>
          </div>
        </div>

        {!authUser && (
          <Alert title="Нужен вход" tone="warning">
            Войдите в аккаунт, чтобы отправить решение и сохранить результат в прогрессе курса.
          </Alert>
        )}

        {submission.phase !== "idle" && (
          <Alert title={phaseCopy.title} tone={phaseCopy.tone}>
            <p>{phaseCopy.description}</p>
            {submission.response && (
              <p className="mt-2 font-mono text-xs text-white/58">
                Технические детали: status={submission.response.status}
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
          <pre className="max-h-64 overflow-auto rounded-2xl border border-line bg-ink p-4 text-xs leading-relaxed text-white/72">
            <code>{limitLog(safeLog)}</code>
          </pre>
        )}
      </PanelBody>
    </Panel>
  );
}
