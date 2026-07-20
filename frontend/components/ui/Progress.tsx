"use client";

// Props progress-bar.
type ProgressProps = {
  // label делает progress понятным для screen reader и визуально.
  label: string;
  // value — процент прогресса от 0 до 100.
  value: number;
};

// Ограничивает число безопасным диапазоном 0..100.
function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

// Progress — единый прогресс-бар для профиля/курса/локального завершения урока.
export function Progress({ label, value }: ProgressProps) {
  const percent = clampPercent(value);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-4 font-mono text-[10px] font-black uppercase text-white/54">
        <span>{label}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(percent)}
        className="relative h-3 overflow-hidden border border-line bg-panel shadow-inner"
        role="progressbar"
      >
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-acid via-ember to-white/90 shadow-[0_0_16px_rgba(255,106,61,0.35)]"
          style={{ width: `${percent}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 -translate-x-full animate-[marathon-scan_3s_linear_infinite] bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.12)_50%,transparent_100%)]"
          style={{ backgroundSize: "30% 100%" }}
        />
      </div>
    </div>
  );
}
