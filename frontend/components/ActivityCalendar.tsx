"use client";

import { useState, type KeyboardEvent } from "react";
import { activityCountLabel, activityDateLabel, activityLevel, activityMonthLabel, activityWeeks } from "../services/activity";
import type { UserActivityDto } from "../types";
import { DailySubmissions } from "./DailySubmissions";

export function ActivityCalendar({ activity, own = false }: { activity: UserActivityDto; own?: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [focused, setFocused] = useState(activity.to);
  const weeks = activityWeeks(activity);
  const days = weeks.flat().filter(day => day !== null);
  const chosen = days.find(day => day.date === selected);
  const total = days.reduce((sum, day) => sum + day.count, 0);

  function navigate(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const step = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }[event.key];
    if (step === undefined && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const index = days.findIndex(day => day.date === date);
    const next = event.key === "Home" ? 0 : event.key === "End" ? days.length - 1 : Math.max(0, Math.min(days.length - 1, index + step!));
    const nextDate = days[next].date;
    setFocused(nextDate);
    const container = event.currentTarget.closest("[data-activity-calendar]");
    container?.querySelector<HTMLButtonElement>(`[data-date="${nextDate}"]`)?.focus();
  }

  return <section aria-label="Активность за год" className="kit-activity">
    <div className="kit-activity-heading">
      <p>{activityCountLabel(total)} за год</p>
    </div>
    <div className="kit-activity-scroll">
      <div className="kit-activity-chart" data-activity-calendar>
        <div aria-hidden="true" className="kit-activity-weekdays"><span>Пн</span><span>Ср</span><span>Пт</span></div>
        <div className="kit-activity-weeks" role="group" aria-label="Календарь отправок решений. Стрелки — переход между днями, Enter — выбрать день.">
          {weeks.map((week, index) => <div className="kit-activity-week" key={index}>
            <span aria-hidden="true" className="kit-activity-month">{activityMonthLabel(week, index)}</span>
            {week.map((day, row) => day ? <button
              key={day.date} type="button" data-date={day.date} data-level={activityLevel(day.count)}
              className="kit-activity-day" aria-label={`${activityDateLabel(day.date)}: ${activityCountLabel(day.count)} решений`}
              aria-pressed={selected === day.date} title={`${activityDateLabel(day.date)} — ${activityCountLabel(day.count)}`}
              tabIndex={focused === day.date ? 0 : -1} onFocus={() => setFocused(day.date)}
              onKeyDown={event => navigate(event, day.date)} onClick={() => setSelected(day.date)} />
              : <span aria-hidden="true" className="kit-activity-empty" key={`empty-${row}`} />)}
          </div>)}
        </div>
      </div>
    </div>
    <div className="kit-activity-footer">
      <p role="status">{chosen && !own ? `${activityDateLabel(chosen.date)} · ${activityCountLabel(chosen.count)}` : ""}</p>
      <div aria-label="Ярче — больше отправок" className="kit-activity-legend">{[0, 1, 2, 3, 4].map(level => <span aria-hidden="true" className="kit-activity-day" data-level={level} key={level} />)}</div>
    </div>
    {own && selected && <DailySubmissions key={selected} date={selected} onClose={() => setSelected(null)} />}
  </section>;
}
