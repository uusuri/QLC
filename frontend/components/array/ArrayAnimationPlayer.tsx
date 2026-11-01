"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseArrayAnimation, type ArrayAnimation, type ArrayStep } from "../../services/arrayAnimation";

export function ArrayAnimationBlock({ source }: { source: string }) {
  const parsed = useMemo(() => {
    try { return { animation: parseArrayAnimation(source), error: "" }; }
    catch (error) { return { animation: null, error: error instanceof Error ? error.message : "Не удалось прочитать массив." }; }
  }, [source]);
  return parsed.animation ? <ArrayAnimationPlayer key={source} animation={parsed.animation} />
    : <p role="status" className="border border-line p-4 text-sm">Не удалось показать массив: {parsed.error}</p>;
}

export function ArrayFrame({ step, pointerRows = 1 }: { step: ArrayStep; pointerRows?: number }) {
  const cells = [-1, ...step.values.map((_, index) => index), step.values.length];
  // Keep boundary slots and pointer space even when a particular step does not use them.
  // Moving a pointer to n or -1 must not change the layout of the animation.
  return <div className="min-w-0 overflow-x-auto pb-2 focus-visible:outline-acid" role="region" aria-label="Массив и индексы" tabIndex={0}>
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(3.5rem, 1fr))` }}>
      {cells.map(index => {
        const boundary = index === -1 || index === step.values.length;
        const pointers = step.pointers.filter(pointer => pointer.index === index);
        const highlighted = step.highlights.includes(index), swapping = step.swap?.includes(index);
        const outside = step.range && (index < step.range.from || index >= step.range.to);
        return <div key={index} className="min-w-0 text-center">
          <div className="mb-1.5 h-5 font-mono text-xs text-[#9ca896]" aria-hidden="true">{boundary ? pointers.length ? index === -1 ? "−1" : "n" : "" : index}</div>
          <div aria-label={boundary ? pointers.length ? `Граница ${index}` : undefined : `Индекс ${index}, значение ${step.values[index]}${highlighted ? ", выделено" : ""}${swapping ? ", обмен" : ""}`}
            aria-hidden={boundary && !pointers.length ? true : undefined}
            className={`flex h-14 items-center justify-center rounded-sm border px-1 font-mono text-base ${boundary ? pointers.length ? "border-dashed border-[#66705d] text-[#9ca896]" : "border-transparent text-transparent" : swapping ? "border-[#c6a0f6] bg-[#c6a0f6]/15 text-white" : highlighted ? "border-[#b8ff35] bg-[#b8ff35]/20 text-white" : outside ? "border-[#66705d]/30 text-[#6f796b]" : "border-[#66705d] text-white"}`}>
            <span className="truncate" title={boundary ? undefined : String(step.values[index])}>{boundary ? pointers.length ? "∅" : "" : step.values[index] === "" ? JSON.stringify("") : String(step.values[index])}</span>
          </div>
          <div className="mt-2 font-mono text-xs text-[#b8ff35]" style={{ minHeight: `${Math.max(pointerRows, pointers.length) * 1.25}rem` }}>
            {pointers.map(pointer => <div className="h-5 truncate" title={`${pointer.label} = ${pointer.index}`} key={pointer.label}><span aria-hidden="true">↑ </span>{pointer.label}<span className="sr-only"> = {pointer.index}</span></div>)}
          </div>
        </div>;
      })}
    </div>
    <div className="flex h-8 flex-wrap content-start justify-center gap-x-5 overflow-y-auto font-mono text-xs leading-4 [overflow-wrap:anywhere]" aria-label="Диапазон и обмен">
      {step.range && <span className="text-[#9ca896]">[{step.range.from}, {step.range.to}){step.range.from === step.range.to ? " — пусто" : ""}</span>}
      {step.swap && <span className="text-[#c6a0f6]">Обмен: {step.swap[0]} ↔ {step.swap[1]}</span>}
      {!step.values.length && <span className="text-[#9ca896]">Пустой массив</span>}
    </div>
  </div>;
}

export function ArrayAnimationPlayer({ animation }: { animation: ArrayAnimation }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(1600);
  const container = useRef<HTMLElement>(null);
  const step = animation.steps[index] ?? animation.steps[0];
  const pointerRows = useMemo(() => Math.max(1, ...animation.steps.map(step => {
    const counts = new Map<number, number>();
    for (const pointer of step.pointers) counts.set(pointer.index, (counts.get(pointer.index) ?? 0) + 1);
    return Math.max(0, ...counts.values());
  })), [animation]);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (index >= animation.steps.length - 1) setPlaying(false);
      else setIndex(index + 1);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [playing, index, duration, animation.steps.length]);
  useEffect(() => {
    const stop = () => setPlaying(false);
    const pause = () => { if (document.hidden) stop(); };
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduceMotion = () => { if (preference.matches) stop(); };
    // No autoplay or moving cells, including for users who request reduced motion.
    document.addEventListener("visibilitychange", pause);
    preference.addEventListener("change", reduceMotion);
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting) stop();
    });
    if (container.current) observer?.observe(container.current);
    return () => { document.removeEventListener("visibilitychange", pause); preference.removeEventListener("change", reduceMotion); observer?.disconnect(); };
  }, []);
  const seek = (next: number) => { setPlaying(false); setIndex(next); };
  const button = "min-h-11 rounded-sm border border-[#66705d] px-3 text-sm disabled:opacity-40";
  return <section ref={container} className="not-prose grid min-w-0 gap-4 rounded-sm border border-line bg-[#101510] p-3 text-[#f1f5ec] sm:p-5" aria-label={`Массив: ${animation.title}`}>
    <h3 className="min-w-0 text-lg font-semibold [overflow-wrap:anywhere]">{animation.title}</h3>
    <ArrayFrame step={step} pointerRows={pointerRows} />
    <p className="h-[4.5rem] min-w-0 overflow-y-auto whitespace-pre-line text-sm leading-6 [overflow-wrap:anywhere] focus-visible:outline-acid" tabIndex={0}
      aria-label="Описание шага" aria-live={playing ? "off" : "polite"}>{step.caption}</p>
    <div className="flex flex-wrap items-center gap-2">
      <button className={button} type="button" onClick={() => seek(0)} disabled={index === 0 && !playing}>В начало</button>
      <button className={button} type="button" onClick={() => seek(index - 1)} disabled={index === 0}>Назад</button>
      <button className={`${button} bg-[#b8ff35] text-[#101510]`} type="button" disabled={animation.steps.length < 2} onClick={() => {
        if (!playing && index === animation.steps.length - 1) setIndex(0);
        setPlaying(!playing);
      }}>{playing ? "Пауза" : "Воспроизвести"}</button>
      <button className={button} type="button" onClick={() => seek(index + 1)} disabled={index === animation.steps.length - 1}>Вперёд</button>
      <select aria-label="Скорость анимации массива" className={`${button} bg-[#101510]`} value={duration} onChange={event => setDuration(Number(event.target.value))}>
        <option value={3200}>0,5×</option><option value={1600}>1×</option><option value={800}>2×</option>
      </select>
    </div>
    <label className="flex items-center gap-3 text-sm"><span className="shrink-0">Шаг {index + 1} / {animation.steps.length}</span>
      <input className="min-h-11 w-full min-w-0 accent-[#b8ff35]" type="range" min={0} max={animation.steps.length - 1} value={index}
        aria-label="Шаг анимации массива" onChange={event => seek(Number(event.target.value))} />
    </label>
  </section>;
}
