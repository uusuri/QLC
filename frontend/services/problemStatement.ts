export const PROBLEM_DIRECTIVE = "problem";
export const MAX_PROBLEM_SOURCE_LENGTH = 65_536;
const MAX_PROBLEM_LINES = 512;
const MAX_TITLE_LENGTH = 160;

export type ProblemStatement = {
  title: string;
  condition: string;
  input: string;
  output: string;
  constraints: string;
};

export type ProblemStatementBlock =
  | { kind: "problem"; statement: ProblemStatement; nextLine: number }
  | { kind: "literal"; source: string; nextLine: number };

const sectionNames = {
  Условие: "condition",
  Ввод: "input",
  Вывод: "output",
  Ограничения: "constraints"
} as const;
type Section = (typeof sectionNames)[keyof typeof sectionNames];
const opening = /^:::problem(?:[\t ]+(.+?))?[\t ]*$/;

/** Reads one explicit directive. Invalid content stays visible, never executed. */
export function readProblemStatement(lines: readonly string[], startLine: number): ProblemStatementBlock | null {
  const start = lines[startLine]?.trim().match(opening);
  if (!start) return null;

  const title = start[1]?.trim() ?? "";
  const sections: Partial<Record<Section, string[]>> = {};
  let section: Section | undefined;
  let valid = title.length > 0 && title.length <= MAX_TITLE_LENGTH;
  let fence: { marker: string; length: number } | undefined;
  let depth = 0;
  let length = lines[startLine].length;

  // If no bounded closing delimiter exists, leave the rest to ordinary Markdown.
  const openingOnly = (): ProblemStatementBlock => ({
    kind: "literal", source: lines[startLine], nextLine: startLine + 1
  });

  for (let index = startLine + 1; index < lines.length && index - startLine < MAX_PROBLEM_LINES; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    length += line.length + 1;
    if (length > MAX_PROBLEM_SOURCE_LENGTH) return openingOnly();

    const marker = trimmed.match(/^(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence.marker && marker[1].length >= fence.length && !marker[2].trim()) {
        fence = undefined;
      }
      if (section) sections[section]!.push(line);
      continue;
    }
    if (marker) {
      fence = { marker: marker[1][0], length: marker[1].length };
      if (section) sections[section]!.push(line);
      else valid = false;
      continue;
    }

    if (opening.test(trimmed)) {
      valid = false;
      depth += 1;
    } else if (trimmed === ":::") {
      if (depth > 0) {
        depth -= 1;
        continue;
      }
      const values = Object.fromEntries(
        Object.values(sectionNames).map((key) => [key, sections[key]?.join("\n").trim() ?? ""])
      ) as Record<Section, string>;
      if (!valid || Object.values(values).some((value) => !value)) {
        return { kind: "literal", source: lines.slice(startLine, index + 1).join("\n"), nextLine: index + 1 };
      }
      return { kind: "problem", statement: { title, ...values }, nextLine: index + 1 };
    }

    const heading = trimmed.match(/^##\s+(.+)$/);
    if (heading) {
      const name = heading[1] as keyof typeof sectionNames;
      if (!Object.hasOwn(sectionNames, name) || sections[sectionNames[name]]) {
        valid = false;
      } else {
        section = sectionNames[name];
        sections[section] = [];
      }
    } else if (section) {
      sections[section]!.push(line);
    } else if (trimmed) {
      valid = false;
    }
  }
  return openingOnly();
}
