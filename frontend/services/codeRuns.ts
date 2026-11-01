export type RunTest = { input: string; output: string | null };
export type RunCaseResult = {
  status: string; stdout: string; stderr: string; executionTimeMs: number;
  memoryUsedKb: number | null; outputTruncated: boolean; message: string | null;
};
export type CodeRunResult = {
  id: string; status: "QUEUED" | "RUNNING" | "FINISHED" | "ERROR";
  message: string | null; tests: RunCaseResult[];
};
export const MAX_RUN_TESTS = 10;

/** Only explicit public examples in the statement. Never inspect private judge data. */
export function publicExampleTests(markdown: string): RunTest[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const tests: RunTest[] = [];
  let inExamples = false;
  let exampleLevel = 6;
  let field: "input" | "output" | null = null;
  let input: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const fence = line.match(/^(`{3,}|~{3,})([^`]*)$/);
    if (fence) {
      const body: string[] = [];
      let closed = false;
      while (++i < lines.length) {
        const end = lines[i].trim();
        if (end[0] === fence[1][0] && new RegExp(`^${fence[1][0]}{${fence[1].length},}\\s*$`).test(end)) {
          closed = true;
          break;
        }
        body.push(lines[i]);
      }
      if (!closed || !inExamples || !field || !/^(?:text|txt|plaintext)?\s*$/i.test(fence[2])) continue;
      const value = body.length ? body.join("\n") + "\n" : "";
      if (field === "input") input = value;
      else if (input !== null) {
        tests.push({ input, output: value });
        input = null;
        if (tests.length === MAX_RUN_TESTS) break;
      }
      field = null;
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const label = (heading?.[2] ?? line).replace(/[*_:]/g, "").trim();
    if (/^(?:Примеры?(?:\s+\d+)?|Examples?(?:\s+\d+)?|Sample(?:\s+\d+)?)$/i.test(label)) {
      inExamples = true;
      exampleLevel = heading?.[1].length ?? 6;
      field = null;
      input = null;
    } else if (inExamples && /^(?:Ввод|Входные данные|Input|Sample input)(?:\s+\d+)?$/i.test(label)) {
      field = "input";
    } else if (inExamples && /^(?:Вывод|Выходные данные|Output|Sample output)(?:\s+\d+)?$/i.test(label)) {
      field = "output";
    } else if (heading && heading[1].length <= exampleLevel) {
      inExamples = false;
      field = null;
      input = null;
    }
  }
  return tests;
}

export function runTestsError(tests: RunTest[]): string | null {
  if (!tests.length || tests.length > MAX_RUN_TESTS) return "Добавьте от 1 до 10 тестов.";
  const size = (text: string | null) => new TextEncoder().encode(text ?? "").length;
  if (tests.some(test => size(test.input) > 16384 || size(test.output) > 16384))
    return "Ввод и ответ одного теста — не более 16 КБ каждый.";
  if (tests.reduce((sum, test) => sum + size(test.input) + size(test.output), 0) > 65536)
    return "Общий размер тестов — не более 64 КБ.";
  return null;
}

export function runStatusLabel(status: string): string {
  return ({ OK: "Выполнено", AC: "Ответ совпал", WA: "Ответ не совпал", RE: "Ошибка выполнения",
    TLE: "Лимит времени", MLE: "Лимит памяти", OLE: "Лимит вывода" } as Record<string, string>)[status] ?? status;
}
