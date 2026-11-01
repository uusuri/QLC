"use client";

import { useEffect, useState } from "react";
import { getMyExperience } from "../services/api";
import { experiencePercent } from "../services/experience";
import type { ExperienceSummaryDto } from "../types";

const number = new Intl.NumberFormat("ru-RU");

export function ExperienceProgressView({ summary }: { summary: ExperienceSummaryDto }) {
  return <section aria-label="Уровень и опыт" className="kit-xp">
    <div className="kit-xp-heading">
      <div><p className="qlc-eyebrow">Мой прогресс</p><h2>Уровень {number.format(summary.level)}</h2></div>
      <p className="kit-xp-total"><strong>{number.format(summary.totalXp)}</strong> XP всего</p>
    </div>
    <div className="kit-xp-caption">
      <span>До уровня {number.format(summary.level + 1)} — {number.format(summary.xpRemaining)} XP</span>
      <span>{number.format(summary.currentLevelXp)} / {number.format(summary.xpRequiredForLevel)} XP</span>
    </div>
    <div className="kit-xp-track" role="progressbar" aria-label="Опыт до следующего уровня"
      aria-valuemin={0} aria-valuemax={summary.xpRequiredForLevel} aria-valuenow={summary.currentLevelXp}
      aria-valuetext={`${summary.currentLevelXp} из ${summary.xpRequiredForLevel} XP. До следующего уровня ${summary.xpRemaining} XP.`}>
      <span style={{ width: `${experiencePercent(summary)}%` }} />
    </div>
  </section>;
}

export function ExperienceProgress({ userId }: { userId: number }) {
  const [summary, setSummary] = useState<ExperienceSummaryDto | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setSummary(null);
    setError("");
    void getMyExperience(controller.signal).then(value => {
      if (!controller.signal.aborted) setSummary(value);
    }).catch(() => {
      if (!controller.signal.aborted) setError("Не удалось загрузить опыт. Попробуйте ещё раз.");
    });
    return () => controller.abort();
  }, [userId, attempt]);

  if (summary) return <ExperienceProgressView summary={summary} />;
  return <section aria-label="Уровень и опыт" aria-busy={!error} className="kit-xp kit-xp-pending">
    <p className="qlc-eyebrow">Мой прогресс</p>
    {error ? <><p role="status">{error}</p><button className="qlc-text-link" type="button"
      onClick={() => setAttempt(value => value + 1)}>Повторить загрузку →</button></>
      : <p role="status">Загружаем уровень и опыт…</p>}
  </section>;
}
