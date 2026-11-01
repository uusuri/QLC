import type { SubmissionHistoryDetailDto, SubmissionHistoryItemDto } from "../types";

export function historyStatus(item: Pick<SubmissionHistoryItemDto, "status" | "verdict">): string {
  const statuses: Record<string, string> = {
    QUEUED: "В очереди", COMPILING: "Компиляция", RUNNING: "Проверяется", DEMO: "Демо · без проверки",
    INFRA_ERROR: "Ошибка проверки", CANCELLED: "Отменено"
  };
  if (item.status !== "FINISHED") return statuses[item.status] ?? "Статус неизвестен";
  const verdicts: Record<string, string> = {
    AC: "AC · Принято", WA: "WA · Неверный ответ", CE: "CE · Ошибка компиляции",
    TLE: "TLE · Лимит времени", MLE: "MLE · Лимит памяти", RE: "RE · Ошибка выполнения", OLE: "OLE · Лимит вывода"
  };
  return verdicts[item.verdict ?? ""] ?? "Проверка завершена";
}

export function historyMetrics(item: Pick<SubmissionHistoryItemDto, "status" | "verdict" | "executionTime" | "memoryUsed">): string {
  if (item.status !== "FINISHED" || item.verdict === "CE") return "";
  const parts: string[] = [];
  if (typeof item.executionTime === "number" && Number.isFinite(item.executionTime) && item.executionTime >= 0)
    parts.push(`${item.executionTime.toLocaleString("ru-RU")} мс`);
  if (typeof item.memoryUsed === "number" && Number.isFinite(item.memoryUsed) && item.memoryUsed >= 0)
    parts.push(item.memoryUsed >= 1024
      ? `${(item.memoryUsed / 1024).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} МБ`
      : `${item.memoryUsed.toLocaleString("ru-RU")} КБ`);
  return parts.join(" / ");
}

export function formatHistoryAnswer(taskType: string, answer: string | null | undefined): string {
  if (answer == null) return "Ответ не сохранён";
  if (taskType !== "TEST") return answer;
  try {
    const indices: unknown = JSON.parse(answer);
    if (Array.isArray(indices) && indices.length && indices.every(i => Number.isSafeInteger(i) && i >= 0 && i < 1000))
      return `Выбраны варианты: ${indices.map(i => i + 1).join(", ")}`;
  } catch { /* Keep the actual stored answer visible even for old formats. */ }
  return answer;
}

export function canRestoreSubmission(detail: SubmissionHistoryDetailDto, taskId: number, language: string): boolean {
  return detail.taskId === taskId && detail.language === language && typeof detail.sourceCode === "string"
    && new TextEncoder().encode(detail.sourceCode).length <= 65_535;
}
