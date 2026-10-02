import type { GraphAnimation, GraphEdge, GraphNode, GraphStep } from "./graphAnimation";

export const GRAPH_PRESETS = [
  { id: "blank", label: "Свой граф" }, { id: "reverse", label: "Разворот списка" },
  { id: "bfs", label: "Обход в ширину" }, { id: "dfs", label: "Обход в глубину" },
  { id: "euler", label: "Эйлеров цикл" }, { id: "sets", label: "Круги Эйлера" }
] as const;
export type GraphPreset = typeof GRAPH_PRESETS[number]["id"];
const node = (id: string, x: number, y: number, radius = 24): GraphNode => ({ id, label: id, x, y, radius });
const edge = (from: string, to: string, directed = false): GraphEdge => ({ id: `${from}-${to}`, from, to, directed, label: "" });
const step = (caption: string, edges: GraphEdge[], activeNodes: string[] = []): GraphStep => ({ caption, edges: edges.map(edge => ({ ...edge })), activeNodes: [...activeNodes], visitedEdges: [], pointers: [] });

export function graphPreset(preset: GraphPreset): GraphAnimation {
  if (preset === "sets") return { version: 1, title: "Пересечение множеств", nodes: [node("A", 345, 220, 100), node("B", 455, 220, 100)],
    steps: [step("Множество A.", [], ["A"]), step("Множество B.", [], ["B"]), step("Общая часть кругов — пересечение A ∩ B.", [], ["A", "B"])] };
  if (preset === "reverse") {
    const nodes = [node("A", 140, 160), node("B", 350, 160), node("C", 560, 160), node("null", 350, 330)];
    const initial = [edge("A", "B", true), edge("B", "C", true), edge("C", "null", true)];
    return { version: 1, title: "Разворот односвязного списка", nodes, steps: [
      { ...step("Начало: prev = null, curr = A.", initial, ["A"]), pointers: [{ label: "prev", node: "null" }, { label: "curr", node: "A" }] },
      { ...step("Сохраняем next = B перед изменением A.next.", initial, ["A", "B"]), trace: { edge: "A-B", from: "A", to: "B" }, pointers: [{ label: "next", node: "B" }] },
      { ...step("A.next = null. Переносим prev на A, curr на B.", [edge("A", "null", true), edge("B", "C", true), edge("C", "null", true)], ["A", "B"]), pointers: [{ label: "prev", node: "A" }, { label: "curr", node: "B" }] },
      { ...step("Сохраняем next = C, затем B.next = A.", [edge("A", "null", true), edge("B", "A", true), edge("C", "null", true)], ["B"]), trace: { edge: "B-A", from: "B", to: "A" }, pointers: [{ label: "prev", node: "B" }, { label: "curr", node: "C" }] },
      { ...step("C.next = B. curr = null: цикл завершён, новая голова — C.", [edge("A", "null", true), edge("B", "A", true), edge("C", "B", true)], ["C"]), trace: { edge: "C-B", from: "C", to: "B" }, pointers: [{ label: "head", node: "C" }, { label: "curr", node: "null" }] }
    ] };
  }
  if (preset === "euler") {
    const nodes = [node("A", 220, 100), node("B", 570, 100), node("C", 570, 330), node("D", 220, 330)];
    const edges = [edge("A", "B"), edge("B", "C"), edge("C", "D"), edge("D", "A")];
    return { version: 1, title: "Эйлеров цикл", nodes, steps: [step("Начинаем в A. Пройдём каждое ребро ровно один раз.", edges, ["A"]),
      ...edges.map((item, i) => ({ ...step(i === 3 ? "Вернулись в A: все рёбра использованы ровно один раз." : `Проходим ${item.from} → ${item.to}.`, edges, [item.to]),
        visitedEdges: edges.slice(0, i + 1).map(edge => edge.id), trace: { edge: item.id, from: item.from, to: item.to } }))] };
  }
  if (preset === "bfs" || preset === "dfs") {
    const nodes = [node("A", 400, 70), node("B", 230, 210), node("C", 570, 210), node("D", 120, 360), node("E", 340, 360), node("F", 620, 360)];
    const edges = [edge("A", "B"), edge("A", "C"), edge("B", "D"), edge("B", "E"), edge("C", "F")];
    const visits = preset === "bfs" ? [0, 1, 2, 3, 4] : [0, 2, 3, 1, 4];
    return { version: 1, title: preset === "bfs" ? "Обход в ширину (BFS)" : "Обход в глубину (DFS)", nodes,
      steps: [step("Начинаем в A. Соседей рассматриваем по алфавиту.", edges, ["A"]), ...visits.map((index, i) => {
        const item = edges[index];
        return { ...step(`${preset === "bfs" ? "Извлекаем вершины из очереди" : "Спускаемся по ветви, при необходимости возвращаемся к родителю"}: ${item.from} → ${item.to}.`, edges, [item.to]),
          visitedEdges: visits.slice(0, i + 1).map(index => edges[index].id), trace: { edge: item.id, from: item.from, to: item.to } };
      })] };
  }
  return { version: 1, title: "Мой граф", nodes: [node("A", 220, 220), node("B", 580, 220)],
    steps: [step("Начальное состояние.", [edge("A", "B", true)], ["A"]),
      { ...step("Переходим из A в B.", [edge("A", "B", true)], ["B"]), trace: { edge: "A-B", from: "A", to: "B" } }] };
}
