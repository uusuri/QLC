type ProgressProps = { label: string; tone?: "dark" | "light"; value: number | null };
export function Progress({ label, value }: ProgressProps) {
  const available = value !== null && Number.isFinite(value);
  const percent = available ? Math.min(100, Math.max(0, value)) : 0;
  return <div className="kit-progress"><div><span>{label}</span><span>{available ? `${Math.round(percent)}%` : "—"}</span></div><div className="kit-progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={available ? percent : undefined} aria-valuetext={available ? undefined : "Прогресс пока недоступен"}><span style={{ width: `${percent}%` }} /></div></div>;
}
