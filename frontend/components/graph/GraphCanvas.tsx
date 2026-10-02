"use client";

import { useId, useMemo, useRef } from "react";
import { edgeGeometry, type GraphAnimation, type GraphNode, type GraphStep } from "../../services/graphAnimation";

export function GraphCanvas({ animation, step, progress = 1, selectedNode, onSelectNode, onMoveNode }: {
  animation: GraphAnimation; step: GraphStep; progress?: number; selectedNode?: string;
  onSelectNode?: (id: string) => void; onMoveNode?: (id: string, x: number, y: number) => void;
}) {
  const marker = useId().replace(/:/g, "");
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef<string | null>(null);
  const geometries = useMemo(() => new Map(step.edges.map(edge => [edge.id, edgeGeometry(animation.nodes, step.edges, edge)])), [animation.nodes, step.edges]);
  const traceEdge = step.edges.find(edge => edge.id === step.trace?.edge);
  const tracePoint = traceEdge ? geometries.get(traceEdge.id)!.point(step.trace!.from === traceEdge.from ? progress : 1 - progress) : null;
  const move = (node: GraphNode, clientX: number, clientY: number) => {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    onMoveNode?.(node.id, Math.round(Math.max(node.radius + 4, Math.min(796 - node.radius, point.x))),
      Math.round(Math.max(node.radius + 4, Math.min(436 - node.radius, point.y))));
  };
  return <svg ref={svg} viewBox="0 0 800 440" className="block w-full min-w-0 rounded-sm border border-[#394435] bg-[#101510]"
    role={onMoveNode ? "group" : "img"} aria-label={`${animation.title}. ${step.caption}`}>
    <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#afbeaa" /></marker></defs>
    {step.edges.map(edge => {
      const geometry = geometries.get(edge.id)!, label = geometry.point(.5);
      return <g key={edge.id}><path d={geometry.path} fill="none" stroke={edge.id === step.trace?.edge ? "#b8ff35" : step.visitedEdges.includes(edge.id) ? "#66cfc6" : "#afbeaa"}
        strokeWidth={edge.id === step.trace?.edge ? 4 : 2} markerEnd={edge.directed ? `url(#${marker})` : undefined} />
        {edge.label && <text x={label.x} y={label.y - 12} textAnchor="middle" fill="#f1f5ec" fontSize="16" paintOrder="stroke" stroke="#101510" strokeWidth="4">{edge.label}</text>}</g>;
    })}
    {animation.nodes.map(node => <g key={node.id} role={onSelectNode ? "button" : undefined} tabIndex={onSelectNode ? 0 : undefined}
      aria-label={onSelectNode ? `Вершина ${node.label}` : undefined} aria-pressed={onSelectNode ? selectedNode === node.id : undefined}
      style={onMoveNode ? { cursor: "grab", touchAction: "none" } : undefined}
      onPointerDown={onMoveNode ? event => { event.preventDefault(); onSelectNode?.(node.id); dragging.current = node.id; event.currentTarget.setPointerCapture(event.pointerId); } : undefined}
      onPointerMove={onMoveNode ? event => { if (dragging.current === node.id) move(node, event.clientX, event.clientY); } : undefined}
      onPointerUp={onMoveNode ? event => { dragging.current = null; event.currentTarget.releasePointerCapture(event.pointerId); } : undefined}
      onPointerCancel={() => { dragging.current = null; }}
      onKeyDown={onSelectNode ? event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectNode(node.id); } } : undefined}>
      <circle cx={node.x} cy={node.y} r={node.radius} fill={step.activeNodes.includes(node.id) ? "#b8ff35" : "#243326"}
        fillOpacity={node.radius > 50 ? .3 : 1} stroke={selectedNode === node.id ? "#fff" : step.activeNodes.includes(node.id) ? "#b8ff35" : "#819479"}
        strokeWidth={selectedNode === node.id ? 4 : 2} />
      <text x={node.x} y={node.y + 6} textAnchor="middle" fill={step.activeNodes.includes(node.id) && node.radius <= 50 ? "#101510" : "#f1f5ec"} fontSize="18" fontWeight="600">
        {node.label.length > 12 ? `${node.label.slice(0, 11)}…` : node.label}<title>{node.label}</title>
      </text>
      {step.pointers.filter(pointer => pointer.node === node.id).map((pointer, index) => <text key={index} x={node.x} y={node.y + node.radius + 22 + index * 18}
        textAnchor="middle" fontSize="15" fill="#b8ff35" paintOrder="stroke" stroke="#101510" strokeWidth="3">{pointer.label}</text>)}
    </g>)}
    {tracePoint && <circle data-graph-tracer="true" cx={tracePoint.x} cy={tracePoint.y} r="8" fill="#fff" stroke="#b8ff35" strokeWidth="3" pointerEvents="none" />}
  </svg>;
}
