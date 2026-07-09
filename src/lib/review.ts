import type { Task, Habit, HabitLog, CheckIn } from "../db";
import { addDays, dayOfISO, fromDayStr, todayStr } from "./dates";
import { computeStreak, isDueOn, logFor, type StreakInfo } from "./habits";

/* ================================================================
   Weekly review — a rolling 7-day look back. All computation is pure
   and derived from the raw tables, so the review can evolve without
   touching stored data. Tone stays gentle: the "one suggestion" is a
   nudge, never a scold, and the numbers celebrate showing up.
   ================================================================ */

export const WINDOW = 7;
const WD_LETTER = ["S", "M", "T", "W", "T", "F", "S"];

export interface StreakEntry {
  habit: Habit;
  streak: StreakInfo;
}

export type SuggestionKind =
  | "start"
  | "streak"
  | "checkin"
  | "rest"
  | "celebrate";

export interface Suggestion {
  text: string;
  kind: SuggestionKind;
}

export interface WeekSummary {
  days: string[]; // 7 day-strings, oldest → newest (ends today)
  weekdayLabels: string[]; // aligned single letters
  todayIndex: number; // always days.length - 1

  tasksDone: number;
  tasksDonePrev: number;
  habitsKept: number;
  checkinCount: number;

  perDayActivity: number[]; // len 7 — tasks + habits per day
  moodByDay: (number | null)[]; // len 7
  moodAvg: number | null;
  moodAvgPrev: number | null;
  energyAvg: number | null;

  streaks: StreakEntry[];
  hasAnyData: boolean;
  suggestion: Suggestion;
}

function makeDays(endDay: string, len: number): string[] {
  const out: string[] = [];
  for (let i = len - 1; i >= 0; i--) out.push(addDays(endDay, -i));
  return out;
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

export interface ReviewInput {
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  checkins: CheckIn[];
  today?: string;
}

export function computeWeekSummary({
  tasks,
  habits,
  habitLogs,
  checkins,
  today = todayStr(),
}: ReviewInput): WeekSummary {
  const days = makeDays(today, WINDOW);
  const prevDays = makeDays(addDays(today, -WINDOW), WINDOW);
  const cur = new Set(days);
  const prev = new Set(prevDays);
  const idx = new Map(days.map((d, i) => [d, i] as const));

  // ---- completions in window ----
  const completedTasks = tasks.filter(
    (t) => t.done && t.completedAt && cur.has(dayOfISO(t.completedAt))
  );
  const tasksDone = completedTasks.length;
  const tasksDonePrev = tasks.filter(
    (t) => t.done && t.completedAt && prev.has(dayOfISO(t.completedAt))
  ).length;

  const keptLogs = habitLogs.filter(
    (l) => l.status === "done" && cur.has(l.date)
  );
  const habitsKept = keptLogs.length;

  const curCheckins = checkins.filter((c) => cur.has(c.date));
  const checkinCount = curCheckins.length;

  // ---- per-day activity (tasks + habits) ----
  const perDayActivity = new Array(WINDOW).fill(0) as number[];
  for (const t of completedTasks) {
    const i = idx.get(dayOfISO(t.completedAt!));
    if (i !== undefined) perDayActivity[i]++;
  }
  for (const l of keptLogs) {
    const i = idx.get(l.date);
    if (i !== undefined) perDayActivity[i]++;
  }

  // ---- mood / energy ----
  const moodByDay: (number | null)[] = new Array(WINDOW).fill(null);
  for (const c of curCheckins) {
    const i = idx.get(c.date);
    if (i !== undefined) moodByDay[i] = c.mood;
  }
  const moodAvg = mean(curCheckins.map((c) => c.mood));
  const energyAvg = mean(curCheckins.map((c) => c.energy));
  const moodAvgPrev = mean(
    checkins.filter((c) => prev.has(c.date)).map((c) => c.mood)
  );

  // ---- streaks ----
  const streaks: StreakEntry[] = habits
    .filter((h) => !h.archived)
    .map((h) => ({ habit: h, streak: computeStreak(h, habitLogs, today) }))
    .filter((e) => e.streak.value > 0)
    .sort((a, b) => b.streak.value - a.streak.value);

  const hasAnyData = tasksDone > 0 || habitsKept > 0 || checkinCount > 0;

  const weekdayLabels = days.map((d) => WD_LETTER[fromDayStr(d).getDay()]);

  const suggestion = pickSuggestion({
    today,
    habits,
    habitLogs,
    streaks,
    hasAnyData,
    checkinCount,
    moodAvg,
    moodAvgPrev,
    energyAvg,
    tasksDone,
  });

  return {
    days,
    weekdayLabels,
    todayIndex: WINDOW - 1,
    tasksDone,
    tasksDonePrev,
    habitsKept,
    checkinCount,
    perDayActivity,
    moodByDay,
    moodAvg,
    moodAvgPrev,
    energyAvg,
    streaks,
    hasAnyData,
    suggestion,
  };
}

/* ---- The one suggestion: a single, gentle, actionable nudge ---- */
function pickSuggestion(ctx: {
  today: string;
  habits: Habit[];
  habitLogs: HabitLog[];
  streaks: StreakEntry[];
  hasAnyData: boolean;
  checkinCount: number;
  moodAvg: number | null;
  moodAvgPrev: number | null;
  energyAvg: number | null;
  tasksDone: number;
}): Suggestion {
  const {
    today,
    habits,
    habitLogs,
    streaks,
    hasAnyData,
    checkinCount,
    moodAvg,
    moodAvgPrev,
    energyAvg,
    tasksDone,
  } = ctx;

  // Brand-new: nothing to review yet.
  if (!hasAnyData && habits.length === 0) {
    return {
      kind: "start",
      text: "A fresh week to shape. Add one small task or habit and the review fills itself in.",
    };
  }

  // A live streak that's due today and not yet logged — most time-sensitive.
  const atRisk = streaks
    .filter(
      (e) =>
        isDueOn(e.habit, today) && logFor(habitLogs, e.habit.id, today) === undefined
    )
    .sort((a, b) => b.streak.value - a.streak.value)[0];
  if (atRisk) {
    const n = atRisk.streak.value;
    const unit = atRisk.streak.unit === "week" ? "week" : "day";
    return {
      kind: "streak",
      text: `${atRisk.habit.name} is on a ${n}-${unit} run — a quick log today keeps it going.`,
    };
  }

  // Not noticing how you feel.
  if (checkinCount === 0) {
    return {
      kind: "checkin",
      text: "No check-ins this week yet. A quick mood note takes seconds and helps you spot patterns.",
    };
  }

  // Mood dipping vs last week.
  if (moodAvg !== null && moodAvgPrev !== null && moodAvg < moodAvgPrev - 0.4) {
    return {
      kind: "rest",
      text: "Mood's dipped a little from last week. Be kind to yourself — a lighter day is completely okay.",
    };
  }

  // Running low on energy.
  if (energyAvg !== null && energyAvg <= 2.2) {
    return {
      kind: "rest",
      text: "Energy's been low this week. Protect a little rest before you pile on more.",
    };
  }

  // Otherwise, celebrate the strongest signal.
  if (streaks.length > 0) {
    const top = streaks[0];
    const n = top.streak.value;
    const noun =
      top.streak.unit === "week"
        ? n === 1
          ? "week"
          : "weeks"
        : n === 1
        ? "day"
        : "days";
    return {
      kind: "celebrate",
      text: `${top.habit.name} is your steadiest thing right now — ${n} ${noun} and counting. Lovely.`,
    };
  }
  if (tasksDone > 0) {
    return {
      kind: "celebrate",
      text: `A steady week — ${tasksDone} ${
        tasksDone === 1 ? "thing" : "things"
      } done. Keep the gentle rhythm going.`,
    };
  }
  return {
    kind: "celebrate",
    text: "You showed up this week. Pick one small thing for tomorrow and let that be enough.",
  };
}
