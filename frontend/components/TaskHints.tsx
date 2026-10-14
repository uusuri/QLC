"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import { Button } from "@/components/ui";

export function TaskHints({ taskId, hints, layout = "inline" }: { taskId: number; hints: string[]; layout?: "inline" | "panel" }) {
  const { user } = useAuth();
  const [opened, setOpened] = useState(0);
  const storageKey = `qlc:hints:${user?.id ?? "anonymous"}:${taskId}`;

  useEffect(() => {
    let count = 0;
    try {
      const stored = Number(localStorage.getItem(storageKey));
      if (Number.isInteger(stored) && stored >= 0) count = Math.min(stored, hints.length);
    } catch { /* Hints also work when browser storage is unavailable. */ }
    setOpened(count);
  }, [storageKey, hints.length]);

  if (!hints.length) return null;

  function revealNext() {
    const count = Math.min(opened + 1, hints.length);
    setOpened(count);
    try { localStorage.setItem(storageKey, String(count)); } catch { /* Optional persistence. */ }
  }

  return <section className={layout === "panel"
    ? "kit-hints-panel grid min-w-0 gap-4 rounded-sm border border-line bg-surface p-5 sm:p-6"
    : "grid gap-4 border-t border-line pt-5"} aria-label="Подсказки">
    <h3 className="text-lg font-semibold">Подсказки</h3>
    <div className="grid gap-3" aria-live="polite" aria-relevant="additions">
      {hints.slice(0, opened).map((hint, index) => <details key={index} open className="border border-line p-4">
        <summary className="cursor-pointer py-1 font-medium text-acid">Подсказка {index + 1}</summary>
        <div className="mt-3"><SafeMarkdown markdown={hint} /></div>
      </details>)}
    </div>
    {opened < hints.length && <Button type="button" onClick={revealNext}>
      {opened === 0 ? "Открыть первую подсказку" : `Открыть подсказку ${opened + 1} из ${hints.length}`}
    </Button>}
  </section>;
}
