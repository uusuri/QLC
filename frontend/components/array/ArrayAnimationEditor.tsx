"use client";

import { useMemo, useState } from "react";
import { ARRAY_LIMITS, arrayFence, parseArrayAnimation, parseArrayValues, type ArrayAnimation, type ArrayStep } from "../../services/arrayAnimation";
import { ArrayAnimationPlayer, ArrayFrame } from "./ArrayAnimationPlayer";

const field = "w-full min-w-0 rounded-sm border border-line bg-ink p-2 text-sm text-paper";
const button = "min-h-10 rounded-sm border border-line px-3 text-sm hover:border-acid disabled:opacity-40";

export function ArrayAnimationEditor({ initial, onApply, onCancel }: {
  initial: ArrayAnimation; onApply: (animation: ArrayAnimation) => void; onCancel: () => void;
}) {
  const [animation, setAnimation] = useState(initial);
  const [index, setIndex] = useState(0);
  const [valuesInput, setValuesInput] = useState(JSON.stringify(initial.steps[0].values));
  const [newValues, setNewValues] = useState(JSON.stringify(initial.steps[0].values));
  const [error, setError] = useState("");
  const step = animation.steps[index];
  const candidate = useMemo(() => {
    try {
      const values = parseArrayValues(valuesInput);
      return { animation: parseArrayAnimation(JSON.stringify({ ...animation,
        steps: animation.steps.map((step, position) => position === index ? { ...step, values } : step) })), error: "" };
    } catch (error) { return { animation: null, error: error instanceof Error ? error.message : "Не удалось прочитать значения." }; }
  }, [animation, index, valuesInput]);

  function changeStep(patch: Partial<ArrayStep>) {
    setError("");
    setAnimation(current => ({ ...current, steps: current.steps.map((item, position) => position === index ? { ...item, ...patch } : item) }));
  }
  function switchStep(next: number) {
    if (!candidate.animation) { setError(candidate.error); return; }
    setAnimation(candidate.animation); setIndex(next); setValuesInput(JSON.stringify(candidate.animation.steps[next].values)); setError("");
  }
  function changeRange(bound: "from" | "to", value: number) {
    if (Number.isInteger(value)) changeStep({ range: { from: 0, to: step.values.length, ...step.range, [bound]: value } });
  }

  return <section aria-label="Редактор анимации массива" className="space-y-4 border-y border-acid/40 bg-panel p-4 text-paper" onKeyDown={event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault(); setError("Сначала нажмите «Вставить в теорию», затем сохраните урок.");
    }
  }}>
    <h3 className="font-semibold">Анимация массива</h3>
    <label className="block text-sm">Название<input className={field} maxLength={160} value={animation.title} onChange={event => setAnimation({ ...animation, title: event.target.value })} /></label>
    <details className="rounded-sm border border-line p-3">
      <summary className="cursor-pointer text-sm">Начать с другого массива</summary>
      <div className="mt-3 flex flex-wrap gap-2">
        <input aria-label="Новый исходный массив" className={field + " sm:!w-80"} value={newValues} maxLength={10_000} onChange={event => setNewValues(event.target.value)} placeholder="[2, 3, 1]" />
        <button type="button" className={button} onClick={() => {
          try {
            const values = parseArrayValues(newValues);
            if (!window.confirm("Заменить все шаги одним начальным шагом с новым массивом?")) return;
            setAnimation({ ...animation, steps: [{ values, caption: "", highlights: [], pointers: [] }] });
            setIndex(0); setValuesInput(JSON.stringify(values)); setError("");
          } catch (error) { setError(error instanceof Error ? error.message : "Не удалось задать массив."); }
        }}>Заменить массив и шаги</button>
      </div>
    </details>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(260px,2fr)]">
      <div className="min-w-0 space-y-3">
        {candidate.animation ? <ArrayFrame step={candidate.animation.steps[index]} /> : <p role="status" className="border border-line p-4 text-sm text-amber-200">{candidate.error}</p>}
        <p className="text-xs leading-5 text-muted">Каждый шаг хранит весь массив. Обмен отмечает пару ячеек; их новые значения задайте на следующем шаге.</p>
        {candidate.animation && <details><summary className="cursor-pointer py-2 text-sm">Проверить воспроизведение</summary><ArrayAnimationPlayer key={JSON.stringify(candidate.animation)} animation={candidate.animation} /></details>}
      </div>
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm">Шаг <select aria-label="Редактируемый шаг массива" className={field + " !w-auto"} value={index} onChange={event => switchStep(Number(event.target.value))}>
            {animation.steps.map((_, i) => <option key={i} value={i}>{i + 1} / {animation.steps.length}</option>)}
          </select></label>
          <button type="button" className={button} disabled={animation.steps.length >= ARRAY_LIMITS.steps || !candidate.animation} onClick={() => {
            if (!candidate.animation) return;
            const steps = [...candidate.animation.steps]; steps.splice(index + 1, 0, structuredClone(steps[index]));
            setAnimation({ ...candidate.animation, steps }); setIndex(index + 1); setError("");
          }}>Добавить шаг-копию</button>
          <button type="button" className={button} disabled={animation.steps.length <= 1} onClick={() => {
            const steps = animation.steps.filter((_, i) => i !== index), next = Math.max(0, index - 1);
            setAnimation({ ...animation, steps }); setIndex(next); setValuesInput(JSON.stringify(steps[next].values)); setError("");
          }}>Удалить шаг</button>
        </div>
        <label className="block text-sm">Значения на шаге<textarea className={field + " font-mono"} rows={2} maxLength={10_000} value={valuesInput} onChange={event => { setValuesInput(event.target.value); setError(""); }} /></label>
        <label className="block text-sm">Описание шага<textarea className={field} rows={3} maxLength={1000} value={step.caption} onChange={event => changeStep({ caption: event.target.value })} /></label>
        <fieldset><legend className="mb-2 text-sm">Выделенные ячейки</legend><div className="flex flex-wrap gap-3">
          {(candidate.animation?.steps[index].values ?? step.values).map((_, position) => <label key={position} className="text-sm"><input type="checkbox" checked={step.highlights.includes(position)} onChange={() => changeStep({
            highlights: step.highlights.includes(position) ? step.highlights.filter(index => index !== position) : [...step.highlights, position]
          })} /> {position}</label>)}
        </div></fieldset>
        <fieldset className="space-y-2"><legend className="mb-2 text-sm">Указатели: i, j, left, right, mid</legend>
          {step.pointers.map((pointer, position) => <div key={position} className="flex gap-2">
            <input aria-label={`Название указателя массива ${position + 1}`} className={field} value={pointer.label} maxLength={20} onChange={event => changeStep({ pointers: step.pointers.map((item, i) => i === position ? { ...item, label: event.target.value } : item) })} />
            <input type="number" aria-label={`Индекс указателя массива ${position + 1}`} className={field + " !w-24"} min={-1} max={step.values.length} value={pointer.index} onChange={event => {
              if (Number.isInteger(event.target.valueAsNumber)) changeStep({ pointers: step.pointers.map((item, i) => i === position ? { ...item, index: event.target.valueAsNumber } : item) });
            }} />
            <button type="button" className={button} aria-label={`Удалить указатель массива ${position + 1}`} onClick={() => changeStep({ pointers: step.pointers.filter((_, i) => i !== position) })}>×</button>
          </div>)}
          <button type="button" className={button} disabled={step.pointers.length >= ARRAY_LIMITS.pointers} onClick={() => {
            const used = new Set(step.pointers.map(pointer => pointer.label));
            const label = ["i", "j", "left", "right", "mid", "k", "a", "b"].find(label => !used.has(label))!;
            changeStep({ pointers: [...step.pointers, { label, index: 0 }] });
          }}>Добавить указатель</button>
          <p className="text-xs text-muted">−1 и n — позиции вне массива, а не его ячейки.</p>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-sm"><label><input type="checkbox" checked={Boolean(step.range)} onChange={event => changeStep({ range: event.target.checked ? { from: 0, to: step.values.length } : undefined })} /> Диапазон [from, to)</label></legend>
          {step.range && <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">from, включительно<input type="number" className={field} min={0} max={step.values.length} value={step.range.from} onChange={event => changeRange("from", event.target.valueAsNumber)} /></label>
            <label className="text-xs">to, не включительно<input type="number" className={field} min={0} max={step.values.length} value={step.range.to} onChange={event => changeRange("to", event.target.valueAsNumber)} /></label>
          </div>}
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-sm"><label><input type="checkbox" checked={Boolean(step.swap)} disabled={step.values.length < 2} onChange={event => changeStep({ swap: event.target.checked ? [0, 1] : undefined })} /> Отметить обмен</label></legend>
          {step.swap && <div className="grid grid-cols-2 gap-2">{([0, 1] as const).map(position => <label key={position} className="text-xs">{position === 0 ? "Первый индекс" : "Второй индекс"}<input type="number" className={field} min={0} max={step.values.length - 1} value={step.swap![position]} onChange={event => {
            if (Number.isInteger(event.target.valueAsNumber)) changeStep({ swap: position === 0 ? [event.target.valueAsNumber, step.swap![1]] : [step.swap![0], event.target.valueAsNumber] });
          }} /></label>)}</div>}
        </fieldset>
      </div>
    </div>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" className={button + " bg-acid text-ink"} onClick={() => {
        try {
          if (!candidate.animation) throw new Error(candidate.error);
          arrayFence(candidate.animation); setError(""); onApply(candidate.animation);
        } catch (error) { setError(error instanceof Error ? error.message : "Не удалось применить анимацию массива."); }
      }}>Вставить в теорию</button>
      <button type="button" className={button} onClick={onCancel}>Отмена</button>
      <p className="self-center text-xs text-muted">После вставки сохраните урок.</p>
    </div>
  </section>;
}
