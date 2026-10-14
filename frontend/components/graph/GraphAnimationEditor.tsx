"use client";

import { useState } from "react";
import { GRAPH_LIMITS, graphFence, removeGraphNode, type GraphAnimation, type GraphNode, type GraphStep } from "../../services/graphAnimation";
import { GRAPH_PRESETS, graphPreset, type GraphPreset } from "../../services/graphPresets";
import { GraphCanvas } from "./GraphCanvas";
import { GraphAnimationPlayer } from "./GraphAnimationPlayer";

const field = "w-full min-w-0 rounded-sm border border-line bg-ink p-2 text-sm text-paper";
const button = "min-h-10 rounded-sm border border-line px-3 text-sm hover:border-acid disabled:opacity-40";
function nextId(prefix: string, ids: string[]) {
  let number = 1;
  while (ids.includes(`${prefix}${number}`)) number++;
  return `${prefix}${number}`;
}

export function GraphAnimationEditor({ initial, onApply, onCancel }: {
  initial: GraphAnimation; onApply: (animation: GraphAnimation) => void; onCancel: () => void;
}) {
  const [animation, setAnimation] = useState(initial);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(initial.nodes[0].id);
  const [preset, setPreset] = useState<GraphPreset>("blank");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [directed, setDirected] = useState(true);
  const [edgeLabel, setEdgeLabel] = useState("");
  const [error, setError] = useState("");
  const step = animation.steps[index];
  const node = animation.nodes.find(item => item.id === selected) ?? animation.nodes[0];
  const source = animation.nodes.find(item => item.id === from)?.id ?? animation.nodes[0].id;
  const target = animation.nodes.find(item => item.id === to)?.id ?? animation.nodes.at(-1)!.id;
  function changeStep(patch: Partial<GraphStep>) {
    setAnimation(current => ({ ...current, steps: current.steps.map((item, position) => position === index ? { ...item, ...patch } : item) }));
  }
  function changeNode(id: string, patch: Partial<GraphNode>) {
    setAnimation(current => ({ ...current, nodes: current.nodes.map(item => {
      if (item.id !== id) return item;
      const next = { ...item, ...patch };
      next.radius = Math.max(16, Math.min(100, next.radius));
      next.x = Math.max(next.radius + 4, Math.min(796 - next.radius, next.x));
      next.y = Math.max(next.radius + 4, Math.min(436 - next.radius, next.y));
      return next;
    }) }));
  }
  function toggle(values: string[], id: string) { return values.includes(id) ? values.filter(value => value !== id) : [...values, id]; }
  const options = animation.nodes.map(item => <option key={item.id} value={item.id}>{item.label || item.id} ({item.id})</option>);

  return <section aria-label="Редактор анимации" className="space-y-4 border-y border-acid/40 bg-panel p-4 text-paper" onKeyDown={event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault(); setError("Сначала нажмите «Вставить в теорию», затем сохраните урок.");
    }
  }}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-semibold">Анимация графа</h3>
      <div className="flex flex-wrap gap-2">
        <select aria-label="Шаблон анимации" className={field + " !w-auto"} value={preset} onChange={event => setPreset(event.target.value as GraphPreset)}>
          {GRAPH_PRESETS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <button type="button" className={button} onClick={() => {
          if (!window.confirm("Заменить текущую анимацию выбранным шаблоном?")) return;
          const next = graphPreset(preset); setAnimation(next); setIndex(0); setSelected(next.nodes[0].id); setError("");
        }}>Заменить шаблоном</button>
      </div>
    </div>
    <label className="block text-sm">Название<input className={field} maxLength={160} value={animation.title} onChange={event => setAnimation({ ...animation, title: event.target.value })} /></label>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(260px,2fr)]">
      <div className="min-w-0 space-y-3">
        <GraphCanvas animation={animation} step={step} selectedNode={node.id} onSelectNode={setSelected} onMoveNode={(id, x, y) => changeNode(id, { x, y })} />
        <p className="text-xs text-muted">Перетаскивайте вершины. Их расположение общее для всех шагов; связи и выделения — отдельные для каждого.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} disabled={animation.nodes.length >= GRAPH_LIMITS.nodes} onClick={() => {
            const id = nextId("n", animation.nodes.map(item => item.id));
            setAnimation({ ...animation, nodes: [...animation.nodes, { id, label: id, x: 400, y: 220, radius: 24 }] }); setSelected(id);
          }}>Добавить вершину</button>
          <button type="button" className={button} disabled={animation.nodes.length <= 1} onClick={() => {
            if (!window.confirm(`Удалить вершину «${node.label}» и её связи из всех шагов?`)) return;
            const next = removeGraphNode(animation, node.id); setAnimation(next); setSelected(next.nodes[0].id);
          }}>Удалить вершину</button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="text-xs">Подпись вершины<input className={field} value={node.label} maxLength={60} onChange={event => changeNode(node.id, { label: event.target.value })} /></label>
          {(["x", "y", "radius"] as const).map(key => <label key={key} className="text-xs">{key === "radius" ? "Радиус" : key.toUpperCase()}<input type="number" className={field} value={node[key]} min={key === "radius" ? 16 : node.radius + 4} max={key === "radius" ? 100 : (key === "x" ? 796 : 436) - node.radius} onChange={event => {
            if (Number.isFinite(event.target.valueAsNumber)) changeNode(node.id, { [key]: event.target.valueAsNumber });
          }} /></label>)}
        </div>
        <details><summary className="cursor-pointer py-2 text-sm">Проверить воспроизведение</summary><GraphAnimationPlayer key={JSON.stringify(animation)} animation={animation} /></details>
      </div>
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm">Шаг <select aria-label="Редактируемый шаг" className={field + " !w-auto"} value={index} onChange={event => setIndex(Number(event.target.value))}>{animation.steps.map((_, i) => <option key={i} value={i}>{i + 1} / {animation.steps.length}</option>)}</select></label>
          <button type="button" className={button} disabled={animation.steps.length >= GRAPH_LIMITS.steps} onClick={() => {
            const steps = [...animation.steps]; steps.splice(index + 1, 0, structuredClone(step)); setAnimation({ ...animation, steps }); setIndex(index + 1);
          }}>Добавить шаг-копию</button>
          <button type="button" className={button} disabled={animation.steps.length <= 1} onClick={() => {
            setAnimation({ ...animation, steps: animation.steps.filter((_, i) => i !== index) }); setIndex(Math.max(0, index - 1));
          }}>Удалить шаг</button>
        </div>
        <label className="block text-sm">Описание шага<textarea className={field} rows={3} maxLength={1000} value={step.caption} onChange={event => changeStep({ caption: event.target.value })} /></label>
        <fieldset className="space-y-2"><legend className="mb-2 text-sm">Связи текущего шага</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">Откуда<select aria-label="Откуда" className={field} value={source} onChange={event => setFrom(event.target.value)}>{options}</select></label>
            <label className="text-xs">Куда<select aria-label="Куда" className={field} value={target} onChange={event => setTo(event.target.value)}>{options}</select></label>
          </div>
          <input aria-label="Подпись новой связи" placeholder="Подпись связи" className={field} value={edgeLabel} maxLength={40} onChange={event => setEdgeLabel(event.target.value)} />
          <div className="flex flex-wrap items-center gap-3"><label className="text-sm"><input type="checkbox" checked={directed} onChange={event => setDirected(event.target.checked)} /> Со стрелкой</label>
            <button type="button" className={button} disabled={step.edges.length >= GRAPH_LIMITS.edges} onClick={() => changeStep({ edges: [...step.edges, { id: nextId("e", step.edges.map(edge => edge.id)), from: source, to: target, label: edgeLabel, directed }] })}>Добавить связь</button></div>
          <ul className="max-h-48 space-y-2 overflow-auto">{step.edges.map(edge => <li key={edge.id} className="flex items-center justify-between gap-2 text-xs">
            <label><input type="checkbox" aria-label={`Пройдена связь ${edge.id}`} checked={step.visitedEdges.includes(edge.id)} onChange={() => changeStep({ visitedEdges: toggle(step.visitedEdges, edge.id) })} /> {animation.nodes.find(n => n.id === edge.from)?.label} {edge.directed ? "→" : "—"} {animation.nodes.find(n => n.id === edge.to)?.label} {edge.label && `(${edge.label})`} · {edge.id}</label>
            <button type="button" className={button} aria-label={`Удалить связь ${edge.id}`} onClick={() => changeStep({ edges: step.edges.filter(item => item.id !== edge.id), visitedEdges: step.visitedEdges.filter(id => id !== edge.id), trace: step.trace?.edge === edge.id ? undefined : step.trace })}>×</button>
          </li>)}</ul>
          <p className="text-xs text-muted">Галочка отмечает уже пройденную связь. Для разворота удалите стрелку и добавьте обратную.</p>
        </fieldset>
        <label className="block text-sm">Трассировка A → B<select className={field} value={step.trace ? `${step.trace.edge}:${step.trace.from}` : ""} onChange={event => {
          const [id, start] = event.target.value.split(":"); const edge = step.edges.find(item => item.id === id);
          changeStep({ trace: edge ? { edge: edge.id, from: start, to: edge.from === start ? edge.to : edge.from } : undefined });
        }}><option value="">Без перемещения</option>{step.edges.flatMap(edge => {
          const directions = [{ from: edge.from, to: edge.to }];
          if (!edge.directed && edge.from !== edge.to) directions.push({ from: edge.to, to: edge.from });
          return directions.map(pair => <option key={`${edge.id}:${pair.from}`} value={`${edge.id}:${pair.from}`}>{animation.nodes.find(n => n.id === pair.from)?.label} → {animation.nodes.find(n => n.id === pair.to)?.label} · {edge.id}</option>);
        })}</select></label>
        <fieldset><legend className="mb-2 text-sm">Выделенные вершины</legend><div className="flex flex-wrap gap-3">{animation.nodes.map(item => <label key={item.id} className="text-sm"><input type="checkbox" checked={step.activeNodes.includes(item.id)} onChange={() => changeStep({ activeNodes: toggle(step.activeNodes, item.id) })} /> {item.label}</label>)}</div></fieldset>
        <fieldset className="space-y-2"><legend className="mb-2 text-sm">Указатели (head, prev, current…)</legend>
          {step.pointers.map((pointer, i) => <div key={i} className="flex gap-2">
            <input aria-label={`Название указателя ${i + 1}`} className={field} value={pointer.label} maxLength={40} onChange={event => changeStep({ pointers: step.pointers.map((item, j) => j === i ? { ...item, label: event.target.value } : item) })} />
            <select aria-label={`Вершина указателя ${i + 1}`} className={field} value={pointer.node} onChange={event => changeStep({ pointers: step.pointers.map((item, j) => j === i ? { ...item, node: event.target.value } : item) })}>{options}</select>
            <button type="button" className={button} aria-label={`Удалить указатель ${i + 1}`} onClick={() => changeStep({ pointers: step.pointers.filter((_, j) => j !== i) })}>×</button>
          </div>)}
          <button type="button" className={button} disabled={step.pointers.length >= 12} onClick={() => changeStep({ pointers: [...step.pointers, { label: "current", node: node.id }] })}>Добавить указатель</button>
        </fieldset>
      </div>
    </div>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" className={button + " bg-acid text-ink"} onClick={() => {
        try { graphFence(animation); setError(""); onApply(animation); } catch (error) { setError(error instanceof Error ? error.message : "Не удалось применить анимацию."); }
      }}>Вставить в теорию</button>
      <button type="button" className={button} onClick={onCancel}>Отмена</button>
      <p className="self-center text-xs text-muted">После вставки сохраните урок.</p>
    </div>
  </section>;
}
