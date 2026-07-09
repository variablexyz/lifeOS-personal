import { db, type Habit, type HabitLog } from "../db";
import { addDays, fromDayStr, toDayStr, todayStr } from "./dates";

/* ================================================================
   Habit engine. Streaks are ALWAYS computed from logs, never stored,
   so the forgiveness rule can evolve without data migrations.
   Forgiveness: one missed due-day per calendar week does not break
   a streak (it just doesn't add to it). No red states, ever.
   ================================================================ */

export function createdDay(h: Habit): string {
  return h.createdAt.slice(0, 10);
}

/** Is this habit expected on the given day? */
export function isDueOn(h: Habit, day: string): boolean {
  if (h.archived) return false;
  if (day < createdDay(h)) return false;
  const s = h.schedule;
  if (s.kind === "daily") return true;
  if (s.kind === "weekdays") return s.days.includes(fromDayStr(day).getDay());
  return true; // timesPerWeek — any day can count toward the target
}

/** Monday of the week containing `day` (weeks run Mon–Sun). */
export function mondayOf(day: string): string {
  const d = fromDayStr(day);
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return toDayStr(d);
}

export interface StreakInfo {
  value: number;
  unit: "day" | "week";
}

export function computeStreak(
  h: Habit,
  logs: HabitLog[],
  today: string = todayStr()
): StreakInfo {
  const byDate = new Map<string, HabitLog["status"]>();
  for (const l of logs) if (l.habitId === h.id) byDate.set(l.date, l.status);

  if (h.schedule.kind === "timesPerWeek") {
    const n = h.schedule.n;
    const doneInWeek = (mon: string) => {
      let c = 0;
      for (let i = 0; i < 7; i++) if (byDate.get(addDays(mon, i)) === "done") c++;
      return c;
    };
    let weeks = 0;
    let mon = mondayOf(today);
    // current week counts as soon as the target is hit; an unfinished
    // current week never breaks the streak
    if (doneInWeek(mon) >= n) weeks++;
    mon = addDays(mon, -7);
    for (let i = 0; i < 520; i++) {
      if (mon < mondayOf(createdDay(h)) && doneInWeek(mon) === 0) break;
      if (doneInWeek(mon) >= n) {
        weeks++;
        mon = addDays(mon, -7);
      } else break;
    }
    return { value: weeks, unit: "week" };
  }

  // daily / weekdays — walk backwards, forgiving one miss per week
  let streak = 0;
  const missedWeeks = new Set<string>();
  let day = today;
  // an unlogged *today* is pending, not a miss
  if (isDueOn(h, day) && byDate.get(day) !== "done") day = addDays(day, -1);
  for (let i = 0; i < 730; i++) {
    if (day < createdDay(h)) break;
    if (!isDueOn(h, day)) {
      day = addDays(day, -1);
      continue;
    }
    const status = byDate.get(day);
    if (status === "done") {
      streak++;
    } else if (status === "skipped") {
      // deliberate skip is neutral: doesn't break, doesn't count
    } else {
      const wk = mondayOf(day);
      if (missedWeeks.has(wk)) break; // second miss that week ends the run
      missedWeeks.add(wk); // first miss — forgiven
    }
    day = addDays(day, -1);
  }
  return { value: streak, unit: "day" };
}

/** x-of-n progress for timesPerWeek habits (null for other kinds). */
export function weekProgress(
  h: Habit,
  logs: HabitLog[],
  today: string = todayStr()
): { done: number; target: number } | null {
  if (h.schedule.kind !== "timesPerWeek") return null;
  const mon = mondayOf(today);
  let done = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i);
    if (logs.some((l) => l.habitId === h.id && l.date === d && l.status === "done"))
      done++;
  }
  return { done, target: h.schedule.n };
}

export function logFor(
  logs: HabitLog[],
  habitId: number,
  day: string
): HabitLog | undefined {
  return logs.find((l) => l.habitId === habitId && l.date === day);
}

/** Tap to log done; tap again to unlog (clears any log, done or skipped).
    Awards XP (± compensating) only for the "done" path — a skip never did. */
export async function toggleHabitLog(habitId: number, day: string) {
  const existing = await db.habitLogs
    .where("[habitId+date]")
    .equals([habitId, day])
    .first();
  const at = new Date().toISOString();
  if (existing) {
    await db.habitLogs.delete(existing.id);
    if (existing.status === "done") {
      await db.xpEvents.add({ source: "habit", amount: -15, at } as never);
    }
  } else {
    await db.habitLogs.add({ habitId, date: day, status: "done" } as never);
    await db.xpEvents.add({ source: "habit", amount: 15, at } as never);
  }
}

/** Mark a day as a deliberate rest/skip — neutral, no XP, doesn't break a
    streak. No-op if a log already exists for that day (undo via the
    checkbox instead, which clears any log regardless of status). */
export async function skipHabitLog(habitId: number, day: string) {
  const existing = await db.habitLogs
    .where("[habitId+date]")
    .equals([habitId, day])
    .first();
  if (existing) return;
  await db.habitLogs.add({ habitId, date: day, status: "skipped" } as never);
}

/** Which of three states a habit is in for a given day — drives sort order,
    the due/not-due visual, and the daily progress summary.
      "needs"   — due today (or still short of its weekly target) and unlogged
      "settled" — a log exists for the day (done or skipped)
      "resting" — not due today, or a timesPerWeek habit already hit target */
export type HabitBucket = "needs" | "settled" | "resting";

export function habitBucket(
  h: Habit,
  logs: HabitLog[],
  today: string = todayStr()
): HabitBucket {
  if (logFor(logs, h.id, today)) return "settled";
  if (!isDueOn(h, today)) return "resting";
  if (h.schedule.kind === "timesPerWeek") {
    const prog = weekProgress(h, logs, today);
    if (prog && prog.done >= prog.target) return "resting";
  }
  return "needs";
}

/* ---------------- Heatmap / calendar cell state ---------------- */

export type CellState = "done" | "skipped" | "missed" | "notdue" | "future";

export interface HeatCell {
  day: string;
  state: CellState;
}

/** Per-day state, shared by the heatmap, week strip, and month calendar.
    For timesPerWeek habits, a single day is never individually "due" —
    only the week's cumulative count is — so an unlogged past day there
    reads as neutral "notdue" rather than "missed". Daily/weekday habits
    keep the per-day missed signal. */
function cellState(
  h: Habit,
  byDate: Map<string, HabitLog["status"]>,
  day: string,
  today: string
): CellState {
  const status = byDate.get(day);
  if (status === "done") return "done";
  if (status === "skipped") return "skipped";
  if (day > today) return "future";
  if (!isDueOn(h, day)) return "notdue";
  const flexible = h.schedule.kind === "timesPerWeek";
  return day === today || flexible ? "notdue" : "missed";
}

function logMap(h: Habit, logs: HabitLog[]): Map<string, HabitLog["status"]> {
  const byDate = new Map<string, HabitLog["status"]>();
  for (const l of logs) if (l.habitId === h.id) byDate.set(l.date, l.status);
  return byDate;
}

/** `weeks` columns × 7 rows (Mon→Sun), ending with the current week.
    weeks=1 gives just the current week — used for the always-visible
    week-strip view. */
export function heatmapCells(
  h: Habit,
  logs: HabitLog[],
  weeks = 12,
  today: string = todayStr()
): HeatCell[][] {
  const byDate = logMap(h, logs);
  const startMon = addDays(mondayOf(today), -7 * (weeks - 1));
  const cols: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(startMon, w * 7 + d);
      col.push({ day, state: cellState(h, byDate, day, today) });
    }
    cols.push(col);
  }
  return cols;
}

/** A single calendar month (Mon-start weeks), padded with `null` for the
    leading/trailing days outside the month so every row has 7 cells. */
export function monthCells(
  h: Habit,
  logs: HabitLog[],
  monthStr: string, // "YYYY-MM"
  today: string = todayStr()
): (HeatCell | null)[][] {
  const byDate = logMap(h, logs);
  const [y, m] = monthStr.split("-").map(Number);
  const first = `${monthStr}-01`;
  const daysInMonth = new Date(y, m, 0).getDate();
  const last = `${monthStr}-${String(daysInMonth).padStart(2, "0")}`;
  const firstDow = (fromDayStr(first).getDay() + 6) % 7; // 0 = Monday

  const weeks: (HeatCell | null)[][] = [];
  let week: (HeatCell | null)[] = new Array(firstDow).fill(null);
  let day = first;
  while (day <= last) {
    week.push({ day, state: cellState(h, byDate, day, today) });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    day = addDays(day, 1);
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

/** Month string ("YYYY-MM") shifted by `delta` months. */
export function shiftMonth(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* ---------------- Weekly totals (bar chart) ---------------- */

export interface WeekBar {
  weekStart: string;
  done: number;
  target: number | null; // set only for timesPerWeek habits
}

/** Done-count per week for the last `weeks` weeks, oldest → newest. */
export function weeklyBars(
  h: Habit,
  logs: HabitLog[],
  weeks = 12,
  today: string = todayStr()
): WeekBar[] {
  const byDate = logMap(h, logs);
  const startMon = addDays(mondayOf(today), -7 * (weeks - 1));
  const target = h.schedule.kind === "timesPerWeek" ? h.schedule.n : null;
  const out: WeekBar[] = [];
  for (let w = 0; w < weeks; w++) {
    const mon = addDays(startMon, w * 7);
    let done = 0;
    for (let d = 0; d < 7; d++) {
      if (byDate.get(addDays(mon, d)) === "done") done++;
    }
    out.push({ weekStart: mon, done, target });
  }
  return out;
}

/* ---------------- Milestones ---------------- */

const DAY_MILESTONES = [7, 14, 30, 60, 100, 200, 365];
const WEEK_MILESTONES = [4, 8, 12, 26, 52];

/** The highest streak milestone reached, or null if none yet. */
export function currentMilestone(s: StreakInfo): number | null {
  const list = s.unit === "week" ? WEEK_MILESTONES : DAY_MILESTONES;
  let hit: number | null = null;
  for (const m of list) {
    if (s.value >= m) hit = m;
    else break;
  }
  return hit;
}

/* ---------------- Labels ---------------- */

const WD_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function scheduleLabel(h: Habit): string {
  const s = h.schedule;
  const kind =
    s.kind === "daily"
      ? "Daily"
      : s.kind === "timesPerWeek"
      ? `${s.n}× a week`
      : s.days
          .slice()
          .sort()
          .map((d) => WD_SHORT[d])
          .join(" ");
  return h.type === "break" ? `Avoid · ${kind}` : kind;
}

export function streakLabel(s: StreakInfo): string {
  if (s.value === 0) return "";
  return s.unit === "week" ? `${s.value} wk` : `${s.value}`;
}
