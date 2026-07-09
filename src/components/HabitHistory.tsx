import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Habit, type HabitLog } from "../db";
import {
  createdDay,
  heatmapCells,
  monthCells,
  shiftMonth,
  toggleHabitLog,
  weeklyBars,
} from "../lib/habits";
import { fromDayStr, todayStr } from "../lib/dates";
import { IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp } from "./icons";

const WD = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Always-visible: this week as 7 dots, Mon→Sun. */
function WeekStrip({ habit, logs, today }: { habit: Habit; logs: HabitLog[]; today: string }) {
  const created = createdDay(habit);
  const col = heatmapCells(habit, logs, 1, today)[0];
  return (
    <div className="wk-dots" aria-label="This week">
      {col.map((c, i) => {
        const loggable = c.state !== "future" && c.day >= created;
        return (
          <div className="wk-dot-col" key={c.day}>
            {loggable ? (
              <button
                className={`wk-dot ${c.state}`}
                aria-label={`${c.day} — ${c.state}, tap to toggle`}
                onClick={() => toggleHabitLog(habit.id, c.day)}
              />
            ) : (
              <span className={`wk-dot ${c.state}`} />
            )}
            <span className="wk-dot-l">{WD[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Detail view for daily/weekday habits — a real month grid. */
function MonthCal({ habit, logs, today }: { habit: Habit; logs: HabitLog[]; today: string }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const weeks = monthCells(habit, logs, month, today);
  const created = createdDay(habit);
  const [y, m] = month.split("-").map(Number);
  const isCurrentMonth = month === today.slice(0, 7);

  return (
    <div className="month-cal">
      <div className="month-nav">
        <button aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
          <IconChevronLeft size={16} />
        </button>
        <span>
          {MONTH_NAMES[m - 1]} {y}
        </span>
        <button
          aria-label="Next month"
          disabled={isCurrentMonth}
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <IconChevronRight size={16} />
        </button>
      </div>
      <div className="month-row month-wd-row">
        {WD.map((w, i) => (
          <span className="month-wd" key={i}>
            {w}
          </span>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div className="month-row" key={wi}>
          {week.map((c, di) => {
            if (!c) return <span className="month-cell pad" key={di} />;
            const loggable = c.state !== "future" && c.day >= created;
            const num = fromDayStr(c.day).getDate();
            return loggable ? (
              <button
                key={di}
                className={`month-cell ${c.state}`}
                aria-label={`${c.day} — ${c.state}, tap to toggle`}
                onClick={() => toggleHabitLog(habit.id, c.day)}
              >
                {num}
              </button>
            ) : (
              <span key={di} className={`month-cell ${c.state}`}>
                {num}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Detail view for timesPerWeek habits — weekly totals, since individual
    days don't matter, only the week's count against its target does. */
function WeeklyBars({ habit, logs, today }: { habit: Habit; logs: HabitLog[]; today: string }) {
  const bars = weeklyBars(habit, logs, 12, today);
  const max = Math.max(1, ...bars.map((b) => Math.max(b.done, b.target ?? 0)));
  return (
    <div className="wbars" aria-label="Weekly totals, last 12 weeks">
      {bars.map((b) => {
        const hit = b.target !== null && b.done >= b.target;
        return (
          <div className="wbar" key={b.weekStart}>
            <div className="wbar-track">
              {b.target !== null && (
                <span
                  className="wbar-target"
                  style={{ bottom: `calc(${(b.target / max) * 100}% - 1px)` }}
                />
              )}
              <i
                className={hit ? "hit" : ""}
                style={{ height: `${(b.done / max) * 100}%` }}
                title={`${b.done}${b.target != null ? ` of ${b.target}` : ""}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Week strip always visible; tap to expand a schedule-appropriate detail
    view — a month calendar for daily/weekday habits (individual days
    matter), weekly bars for timesPerWeek habits (only the weekly count
    does). Replaces the old always-expanded 12-week heatmap. */
export default function HabitHistory({ habit }: { habit: Habit }) {
  const logs =
    useLiveQuery(() => db.habitLogs.where("habitId").equals(habit.id).toArray(), [habit.id]) ?? [];
  const [expanded, setExpanded] = useState(false);
  const today = todayStr();

  return (
    <div className="hab-hist">
      <WeekStrip habit={habit} logs={logs} today={today} />
      <button className="hist-toggle" onClick={() => setExpanded((e) => !e)}>
        {expanded ? "Hide history" : "Show history"}
        {expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
      </button>
      {expanded &&
        (habit.schedule.kind === "timesPerWeek" ? (
          <WeeklyBars habit={habit} logs={logs} today={today} />
        ) : (
          <MonthCal habit={habit} logs={logs} today={today} />
        ))}
    </div>
  );
}
