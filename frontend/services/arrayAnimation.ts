export type ArrayValue = number | string;
export type ArrayStep = {
  values: ArrayValue[];
  caption: string;
  highlights: number[];
  pointers: { label: string; index: number }[];
  /** Half-open interval: from is included, to is excluded. Equal bounds mean an empty interval. */
  range?: { from: number; to: number };
  swap?: [number, number];
};
export type ArrayAnimation = { version: 1; title: string; steps: ArrayStep[] };
export type ArrayBlockRange = { start: number; end: number; source: string };

export const ARRAY_FENCE = "qlc-array";
export const ARRAY_LIMITS = { cells: 40, steps: 120, pointers: 8, source: 250_000 };

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Ожидается объект анимации массива.");
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number): string {
  if (typeof value !== "string" || value.length > max) throw new Error(`Текст должен быть не длиннее ${max} символов.`);
  return value;
}
function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(`Ожидается список: не более ${max} элементов.`);
  return value;
}
function position(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`Индекс должен быть целым числом от ${min} до ${max}.`);
  }
  return value;
}
function values(value: unknown): ArrayValue[] {
  return list(value, ARRAY_LIMITS.cells).map(item => {
    if (typeof item === "number" && Number.isFinite(item) && Math.abs(item) <= Number.MAX_SAFE_INTEGER) return item;
    if (typeof item === "string" && item.length <= 32) return item;
    throw new Error("Ячейка должна содержать число в безопасном диапазоне или строку до 32 символов.");
  });
}

export function parseArrayValues(source: string): ArrayValue[] {
  if (source.length > 10_000) throw new Error("Список значений слишком большой.");
  let input: unknown;
  try { input = JSON.parse(source); } catch { throw new Error("Введите JSON-массив, например [2, 3, 1]."); }
  return values(input);
}

// Every step is a complete data snapshot. Seeking never evaluates source code or replays mutations.
export function parseArrayAnimation(source: string): ArrayAnimation {
  if (source.length > ARRAY_LIMITS.source) throw new Error("Блок анимации массива слишком большой.");
  let input: unknown;
  try { input = JSON.parse(source); } catch { throw new Error("Некорректный JSON анимации массива."); }
  const data = record(input);
  if (data.version !== 1) throw new Error("Неподдерживаемая версия анимации массива.");
  let length: number | undefined;
  const steps = list(data.steps, ARRAY_LIMITS.steps).map(value => {
    const step = record(value), cells = values(step.values);
    if (length !== undefined && cells.length !== length) throw new Error("Число ячеек должно совпадать во всех шагах.");
    length = cells.length;
    const highlights = list(step.highlights ?? [], ARRAY_LIMITS.cells).map(item => position(item, 0, cells.length - 1));
    if (new Set(highlights).size !== highlights.length) throw new Error("Выделенные индексы не должны повторяться.");
    const pointers = list(step.pointers ?? [], ARRAY_LIMITS.pointers).map(value => {
      const pointer = record(value), label = text(pointer.label, 20).trim();
      if (!label) throw new Error("Укажите название указателя.");
      return { label, index: position(pointer.index, -1, cells.length) };
    });
    if (new Set(pointers.map(pointer => pointer.label)).size !== pointers.length) throw new Error("Названия указателей в шаге не должны повторяться.");
    let range: ArrayStep["range"];
    if (step.range !== undefined) {
      const item = record(step.range);
      range = { from: position(item.from, 0, cells.length), to: position(item.to, 0, cells.length) };
      if (range.from > range.to) throw new Error("Для диапазона [from, to) должно выполняться from ≤ to.");
    }
    let swap: ArrayStep["swap"];
    if (step.swap !== undefined) {
      const pair = list(step.swap, 2);
      if (pair.length !== 2) throw new Error("Для обмена укажите ровно два индекса.");
      swap = [position(pair[0], 0, cells.length - 1), position(pair[1], 0, cells.length - 1)];
      if (swap[0] === swap[1]) throw new Error("Для обмена выберите разные ячейки.");
    }
    return { values: cells, caption: text(step.caption ?? "", 1000), highlights, pointers, range, swap };
  });
  if (!steps.length) throw new Error("Добавьте хотя бы один шаг.");
  return { version: 1, title: text(data.title, 160), steps };
}

export function blankArrayAnimation(): ArrayAnimation {
  return { version: 1, title: "Массив", steps: [{ values: [2, 3, 1], caption: "", highlights: [], pointers: [] }] };
}

export function arrayFence(animation: ArrayAnimation): string {
  const json = JSON.stringify(animation, null, 2).replace(/`/g, "\\u0060");
  parseArrayAnimation(json);
  return `\`\`\`${ARRAY_FENCE}\n${json}\n\`\`\``;
}

export function insertArrayBlock(markdown: string, start: number, end: number, animation: ArrayAnimation): string {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > markdown.length) {
    throw new Error("Некорректное место вставки анимации массива.");
  }
  const before = markdown.slice(0, start), after = markdown.slice(end), block = arrayFence(animation);
  if (end > start) return before + block + after;
  const left = !before || /\r?\n\r?\n$/.test(before) ? "" : /\r?\n$/.test(before) ? "\n" : "\n\n";
  const right = !after || /^\r?\n\r?\n/.test(after) ? "" : /^\r?\n/.test(after) ? "\n" : "\n\n";
  return before + left + block + right + after;
}

export function findArrayBlocks(markdown: string): ArrayBlockRange[] {
  const result: ArrayBlockRange[] = [];
  let fence: { start: number; body: number; array: boolean } | null = null;
  for (const match of markdown.matchAll(/[^\n]*(?:\n|$)/g)) {
    if (!match[0] || !match[0].trim().startsWith("```")) continue;
    if (fence) {
      if (fence.array) result.push({ start: fence.start, end: match.index + match[0].trimEnd().length,
        source: markdown.slice(fence.body, match.index).trim() });
      fence = null;
    } else {
      fence = { start: match.index, body: match.index + match[0].length, array: match[0].trim() === `\`\`\`${ARRAY_FENCE}` };
    }
  }
  return result;
}
