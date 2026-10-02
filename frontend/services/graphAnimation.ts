export type GraphNode = { id: string; label: string; x: number; y: number; radius: number };
export type GraphEdge = { id: string; from: string; to: string; directed: boolean; label: string };
export type GraphStep = {
  caption: string;
  edges: GraphEdge[];
  activeNodes: string[];
  visitedEdges: string[];
  pointers: { label: string; node: string }[];
  trace?: { edge: string; from: string; to: string };
};
export type GraphAnimation = { version: 1; title: string; nodes: GraphNode[]; steps: GraphStep[] };

export const GRAPH_FENCE = "qlc-graph";
export const GRAPH_LIMITS = { nodes: 40, edges: 120, steps: 120, source: 250_000 };

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Ожидается объект анимации.");
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 1000): string {
  if (typeof value !== "string" || value.length > max) throw new Error(`Текст должен быть не длиннее ${max} символов.`);
  return value;
}
function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(`Ожидается список: не более ${max} элементов.`);
  return value;
}
function id(value: unknown): string {
  const result = text(value, 40);
  if (!/^[a-zA-Z0-9_-]+$/.test(result)) throw new Error("ID: латинские буквы, цифры, _ или -.");
  return result;
}
function coordinate(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error(`Координата должна быть от ${min} до ${max}.`);
  return value;
}
function unique(ids: string[]) {
  if (new Set(ids).size !== ids.length) throw new Error("ID элементов не должны повторяться.");
}
function references(value: unknown, valid: Set<string>): string[] {
  const result = list(value ?? [], 120).map(id);
  if (result.some(key => !valid.has(key))) throw new Error("Шаг ссылается на отсутствующий элемент.");
  return [...new Set(result)];
}

// Parse only data, never executable HTML/JS. Bounded snapshots also make backwards seeking deterministic.
export function parseGraphAnimation(source: string): GraphAnimation {
  if (source.length > GRAPH_LIMITS.source) throw new Error("Блок анимации слишком большой.");
  let input: unknown;
  try { input = JSON.parse(source); } catch { throw new Error("Некорректный JSON блока анимации."); }
  const data = record(input);
  if (data.version !== 1) throw new Error("Неподдерживаемая версия анимации.");
  const nodes = list(data.nodes, GRAPH_LIMITS.nodes).map(value => {
    const node = record(value);
    const radius = coordinate(node.radius ?? 24, 16, 100);
    return { id: id(node.id), label: text(node.label, 60), radius,
      x: coordinate(node.x, radius + 4, 800 - radius - 4), y: coordinate(node.y, radius + 4, 440 - radius - 4) };
  });
  if (!nodes.length) throw new Error("Добавьте хотя бы одну вершину.");
  unique(nodes.map(node => node.id));
  const nodeIds = new Set(nodes.map(node => node.id));
  const steps = list(data.steps, GRAPH_LIMITS.steps).map(value => {
    const step = record(value);
    const edges = list(step.edges, GRAPH_LIMITS.edges).map(value => {
      const edge = record(value);
      const from = id(edge.from), to = id(edge.to);
      if (!nodeIds.has(from) || !nodeIds.has(to)) throw new Error("Связь ссылается на отсутствующую вершину.");
      if (typeof edge.directed !== "boolean") throw new Error("Укажите направление связи.");
      return { id: id(edge.id), from, to, directed: edge.directed, label: text(edge.label ?? "", 40) };
    });
    unique(edges.map(edge => edge.id));
    const edgeIds = new Set(edges.map(edge => edge.id));
    const pointers = list(step.pointers ?? [], 12).map(value => {
      const pointer = record(value), node = id(pointer.node);
      if (!nodeIds.has(node)) throw new Error("Указатель ссылается на отсутствующую вершину.");
      return { node, label: text(pointer.label, 40) };
    });
    let trace: GraphStep["trace"];
    if (step.trace !== undefined) {
      const item = record(step.trace);
      trace = { edge: id(item.edge), from: id(item.from), to: id(item.to) };
      const edge = edges.find(edge => edge.id === trace!.edge);
      if (!edge || !(edge.from === trace.from && edge.to === trace.to || !edge.directed && edge.from === trace.to && edge.to === trace.from)) {
        throw new Error("Трассировка должна идти по существующей связи в допустимом направлении.");
      }
    }
    return { caption: text(step.caption), edges, pointers, trace,
      activeNodes: references(step.activeNodes, nodeIds), visitedEdges: references(step.visitedEdges, edgeIds) };
  });
  if (!steps.length) throw new Error("Добавьте хотя бы один шаг.");
  return { version: 1, title: text(data.title, 160), nodes, steps };
}

export function graphFence(animation: GraphAnimation): string {
  // Prevent captions containing Markdown fences from prematurely closing this block.
  const json = JSON.stringify(animation, null, 2).replace(/`/g, "\\u0060");
  parseGraphAnimation(json);
  return `\`\`\`${GRAPH_FENCE}\n${json}\n\`\`\``;
}

export type GraphBlockRange = { start: number; end: number; source: string };
export function insertGraphBlock(markdown: string, start: number, end: number, animation: GraphAnimation): string {
  const before = markdown.slice(0, start), after = markdown.slice(end), block = graphFence(animation);
  if (end > start) return before + block + after;
  const left = !before || /\r?\n\r?\n$/.test(before) ? "" : /\r?\n$/.test(before) ? "\n" : "\n\n";
  const right = !after || /^\r?\n\r?\n/.test(after) ? "" : /^\r?\n/.test(after) ? "\n" : "\n\n";
  return before + left + block + right + after;
}

export function findGraphBlocks(markdown: string): GraphBlockRange[] {
  const result: GraphBlockRange[] = [];
  let fence: { start: number; body: number; graph: boolean } | null = null;
  const lines = /[^\n]*(?:\n|$)/g;
  for (const match of markdown.matchAll(lines)) {
    if (!match[0]) continue;
    const trimmed = match[0].trim();
    if (!trimmed.startsWith("```")) continue;
    if (fence) {
      if (fence.graph) result.push({ start: fence.start, end: match.index + match[0].trimEnd().length, source: markdown.slice(fence.body, match.index).trim() });
      fence = null;
    } else {
      fence = { start: match.index, body: match.index + match[0].length, graph: trimmed === `\`\`\`${GRAPH_FENCE}` };
    }
  }
  return result;
}

export function removeGraphNode(animation: GraphAnimation, nodeId: string): GraphAnimation {
  return { ...animation, nodes: animation.nodes.filter(node => node.id !== nodeId), steps: animation.steps.map(step => {
    const edges = step.edges.filter(edge => edge.from !== nodeId && edge.to !== nodeId);
    return { ...step, edges, activeNodes: step.activeNodes.filter(id => id !== nodeId),
      pointers: step.pointers.filter(pointer => pointer.node !== nodeId),
      visitedEdges: step.visitedEdges.filter(id => edges.some(edge => edge.id === id)),
      trace: step.trace && edges.some(edge => edge.id === step.trace!.edge) ? step.trace : undefined };
  }) };
}

export function edgeGeometry(nodes: GraphNode[], edges: GraphEdge[], edge: GraphEdge) {
  const a = nodes.find(node => node.id === edge.from)!;
  const b = nodes.find(node => node.id === edge.to)!;
  const peers = edges.filter(item => item.from === edge.from && item.to === edge.to || item.from === edge.to && item.to === edge.from);
  const lane = peers.findIndex(item => item.id === edge.id) - (peers.length - 1) / 2;
  const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1;
  const sign = a.id < b.id ? 1 : -1;
  const bend = lane * 52 * sign;
  const start = { x: a.x + dx / length * a.radius, y: a.y + dy / length * a.radius };
  const end = { x: b.x - dx / length * (b.radius + 5), y: b.y - dy / length * (b.radius + 5) };
  const control = { x: (a.x + b.x) / 2 - dy / length * bend, y: (a.y + b.y) / 2 + dx / length * bend };
  if (a.id === b.id) {
    const r = a.radius, extent = r + 50 + (lane + peers.length) * 12;
    // Keep loops inside the canvas, including nodes near its top edge.
    const direction = a.y < 170 ? 1 : -1;
    const p = { x: a.x - r * .7, y: a.y + direction * r * .7 };
    const q = { x: a.x + r * .7, y: p.y };
    const c1 = { x: Math.max(4, a.x - extent), y: Math.max(4, Math.min(436, a.y + direction * extent)) };
    const c2 = { x: Math.min(796, a.x + extent), y: c1.y };
    return { path: `M ${p.x} ${p.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${q.x} ${q.y}`,
      point: (t: number) => ({ x: (1-t)**3*p.x+3*(1-t)**2*t*c1.x+3*(1-t)*t*t*c2.x+t**3*q.x,
        y: (1-t)**3*p.y+3*(1-t)**2*t*c1.y+3*(1-t)*t*t*c2.y+t**3*q.y }) };
  }
  return { path: `M ${start.x} ${start.y} Q ${control.x} ${control.y}, ${end.x} ${end.y}`,
    point: (t: number) => ({ x: (1-t)**2*start.x+2*(1-t)*t*control.x+t*t*end.x,
      y: (1-t)**2*start.y+2*(1-t)*t*control.y+t*t*end.y }) };
}
