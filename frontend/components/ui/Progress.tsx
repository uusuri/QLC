"use client";

// Props progress-bar.
type ProgressProps = {
  // label делает progress понятным для screen reader и визуально.
  label: string;
  // light используется на светлом фоне.
  tone?: "dark" | "light";
  // value — процент прогресса от 0 до 100.
  value: number;
};

// Ограничивает число безопасным диапазоном 0..100.
function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

// Progress — единый прогресс-бар для профиля/курса/локального завершения урока.
export function Progress({ label, tone = "dark", value }: ProgressProps) {
  const percent = clampPercent(value);
  const isLight = tone === "light";

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-4 font-mono text-xs font-bold text-current opacity-70">
        <span>{label}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(percent)}
        className="relative h-2 overflow-hidden rounded-full"
        role="progressbar"
        style={{
          backgroundColor: isLight ? "rgba(11, 13, 15, 0.2)" : "rgba(255, 255, 255, 0.12)"
        }}
      >
        <div
          className="absolute left-0 top-0 h-full"
          style={{
            backgroundColor: isLight ? "#0b0d0f" : "#b8ff35",
            width: `${percent}%`
          }}
        />
      </div>
    </div>
  );
}
