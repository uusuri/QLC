"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { programStorageKey, type ProgramSnapshot, type ProgramState } from "../services/courseProgram";

// The page loads its curriculum asynchronously, so browser history alone restores too early.
export function useCourseProgramPosition(courseId: number, state: ProgramState, initial: ProgramSnapshot | null, ready: boolean) {
  const stateRef = useRef(state);
  stateRef.current = state;
  const restored = useRef(!initial);
  const restoring = useRef(Boolean(initial));
  const pending = useRef(initial);

  useLayoutEffect(() => {
    if (!restored.current && initial && state !== initial.state) {
      restored.current = true; restoring.current = false;
    }
    if (restored.current || !ready) return;
    restored.current = true;
    const saved = pending.current;
    if (!saved || (location.hash && location.hash !== "#curriculum")) { restoring.current = false; return; }
    let frame = 0, stopped = false;
    const place = () => {
      if (stopped) return;
      const anchor = saved.anchor && document.getElementById(`program-lesson-${saved.anchor.id}`);
      const top = anchor ? window.scrollY + anchor.getBoundingClientRect().top - saved.anchor!.offset : saved.scrollY;
      window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(place); };
    const observer = new ResizeObserver(schedule);
    const stop = () => {
      stopped = true; restoring.current = false;
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("keydown", stop);
    };
    observer.observe(document.body);
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("pointerdown", stop);
    window.addEventListener("keydown", stop);
    place(); schedule();
    void document.fonts.ready.then(schedule);
    const timer = window.setTimeout(stop, 1500);
    return () => { window.clearTimeout(timer); stop(); };
  }, [ready, state, initial]);

  useEffect(() => {
    let timer = 0, leaving = false;
    const path = location.pathname;
    const save = (target?: HTMLElement | null) => {
      if (restoring.current || leaving || location.pathname !== path) return;
      const row = target?.closest<HTMLElement>("[data-program-lesson]") ??
        Array.from(document.querySelectorAll<HTMLElement>("[data-program-lesson]")).find(item => {
          const bounds = item.getBoundingClientRect();
          return bounds.bottom > 180 && bounds.top < window.innerHeight;
        });
      const snapshot: ProgramSnapshot = { version: 1, state: stateRef.current, scrollY: window.scrollY,
        anchor: row ? { id: Number(row.dataset.programLesson), offset: row.getBoundingClientRect().top } : null };
      try { sessionStorage.setItem(programStorageKey(courseId), JSON.stringify(snapshot)); } catch { /* Navigation still works without storage. */ }
    };
    const scroll = () => { window.clearTimeout(timer); timer = window.setTimeout(() => save(), 180); };
    const click = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      const link = target?.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const destination = new URL(link.href, location.href);
      if (destination.origin !== location.origin || destination.pathname === path) return;
      save(target); leaving = true;
    };
    const pagehide = () => save();
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("pagehide", pagehide);
    document.addEventListener("click", click, true);
    return () => {
      save(); window.clearTimeout(timer);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("pagehide", pagehide);
      document.removeEventListener("click", click, true);
    };
  }, [courseId]);
}
