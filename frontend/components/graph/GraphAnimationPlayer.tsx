"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseGraphAnimation, type GraphAnimation } from "../../services/graphAnimation";
import { GraphCanvas } from "./GraphCanvas";

export function GraphAnimationBlock({ source }: { source: string }) {
  const parsed = useMemo(() => {
    try { return { animation: parseGraphAnimation(source), error: "" }; }
    catch (error) { return { animation: null, error: error instanceof Error ? error.message : "Не удалось прочитать анимацию." }; }
  }, [source]);
  return parsed.animation ? <GraphAnimationPlayer key={source} animation={parsed.animation} />
    : <p role="status" className="border border-line p-4 text-sm">Не удалось показать анимацию: {parsed.error}</p>;
}

export function GraphAnimationPlayer({ animation }: { animation: GraphAnimation }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(1600);
  const [progress, setProgress] = useState(1);
  const [motionPaused, setMotionPaused] = useState(false);
  const step = animation.steps[index] ?? animation.steps[0];
  const motion = useRef({ step, duration, progress: 0 });
  const container = useRef<HTMLElement>(null);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    if (motion.current.step !== step || motion.current.duration !== duration) {
      motion.current = { step, duration, progress: 0 };
      setProgress(0);
    }
    if (!step.trace || query.matches) { setProgress(1); return; }
    if (motionPaused) return;
    const start = performance.now(), initial = motion.current.progress;
    const tick = (time: number) => {
      const next = Math.min(1, initial + (time - start) / (duration * .7));
      motion.current.progress = next;
      setProgress(next);
      if (next < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [step, duration, motionPaused]);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (index >= animation.steps.length - 1) setPlaying(false);
      else setIndex(index + 1);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [playing, index, duration, animation.steps.length]);
  useEffect(() => {
    const stop = () => { setPlaying(false); setMotionPaused(true); };
    const pause = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", pause);
    const observer = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stop(); });
    if (container.current) observer.observe(container.current);
    return () => { document.removeEventListener("visibilitychange", pause); observer.disconnect(); };
  }, []);
  const seek = (next: number) => { setPlaying(false); setMotionPaused(false); setIndex(next); };
  const button = "min-h-11 rounded-sm border border-[#66705d] px-3 text-sm disabled:opacity-40";
  return <section ref={container} className="not-prose grid min-w-0 gap-4 rounded-sm border border-line bg-[#101510] p-3 text-[#f1f5ec] sm:p-5" aria-label={`Анимация: ${animation.title}`}>
    <h3 className="text-lg font-semibold">{animation.title}</h3>
    <GraphCanvas animation={animation} step={step} progress={progress} />
    <p className="min-h-12 text-sm leading-6" aria-live={playing ? "off" : "polite"}>{step.caption}</p>
    <div className="flex flex-wrap items-center gap-2">
      <button className={button} type="button" onClick={() => seek(0)} disabled={index === 0 && !playing}>В начало</button>
      <button className={button} type="button" onClick={() => seek(index - 1)} disabled={index === 0}>Назад</button>
      <button className={`${button} bg-[#b8ff35] text-[#101510]`} type="button" onClick={() => { if (!playing && index === animation.steps.length - 1) setIndex(0); setMotionPaused(playing); setPlaying(!playing); }} disabled={animation.steps.length < 2}>{playing ? "Пауза" : "Воспроизвести"}</button>
      <button className={button} type="button" onClick={() => seek(index + 1)} disabled={index === animation.steps.length - 1}>Вперёд</button>
      <select aria-label="Скорость анимации" className={`${button} bg-[#101510]`} value={duration} onChange={event => setDuration(Number(event.target.value))}>
        <option value={3200}>0,5×</option><option value={1600}>1×</option><option value={800}>2×</option>
      </select>
    </div>
    <label className="flex items-center gap-3 text-sm"><span className="shrink-0">Шаг {index + 1} / {animation.steps.length}</span>
      <input className="min-h-11 w-full min-w-0 accent-[#b8ff35]" type="range" min={0} max={animation.steps.length - 1} value={index}
        aria-label="Шаг анимации" onChange={event => seek(Number(event.target.value))} />
    </label>
  </section>;
}
