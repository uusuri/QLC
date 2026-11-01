import type { SubmissionHistoryDetailDto } from "../types";
import { formatHistoryAnswer } from "../services/submissionHistory";

export function SubmissionPayload({ detail, taskType }: { detail: SubmissionHistoryDetailDto; taskType: string }) {
  return <>
    <h3>{typeof detail.sourceCode === "string" ? "Отправленный код" : "Ваш ответ"}</h3>
    <pre><code>{detail.sourceCode ?? formatHistoryAnswer(taskType, detail.submittedAnswer)}</code></pre>
    {taskType === "TEST" && <p className="text-xs text-muted">Номера вариантов на момент отправки. Текст вариантов мог измениться.</p>}
  </>;
}
