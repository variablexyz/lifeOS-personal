import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";

/* ================================================================
   XP & levels. Every award writes an XPEvent (audit trail — the
   weekly review can explain where XP came from). Undoing an action
   writes a compensating negative event rather than deleting history.
   ================================================================ */

export const XP = {
  task: 10,
  subtask: 5,
  habit: 15,
  checkin: 10,
} as const;

export type XPSource = "task" | "subtask" | "habit" | "checkin";

export async function awardXP(source: XPSource, amount: number) {
  await db.xpEvents.add({
    source,
    amount,
    at: new Date().toISOString(),
  } as never);
}

/* ---- Level curve: gentle, roughly linear growth ----
   XP needed to go from level L to L+1: 100 + (L-1)*50
   L1→2: 100 · L2→3: 150 · L3→4: 200 … */
export function levelNeed(level: number): number {
  return 100 + (level - 1) * 50;
}

export interface LevelInfo {
  level: number;
  totalXP: number;
  intoLevel: number; // XP earned within the current level
  need: number; // XP required to reach the next level
  frac: number; // 0..1 progress to next level
}

export function levelFromXP(totalXP: number): LevelInfo {
  let level = 1;
  let rest = Math.max(0, totalXP);
  while (rest >= levelNeed(level)) {
    rest -= levelNeed(level);
    level++;
  }
  const need = levelNeed(level);
  return { level, totalXP, intoLevel: rest, need, frac: rest / need };
}

/** Live level info — recomputes whenever any XP is earned. */
export function useLevel(): LevelInfo {
  const total =
    useLiveQuery(async () => {
      const events = await db.xpEvents.toArray();
      return events.reduce((s, e) => s + e.amount, 0);
    }, []) ?? 0;
  return levelFromXP(total);
}

/** XP earned today (shown in the companion sheet). */
export function useTodayXP(): number {
  return (
    useLiveQuery(async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const events = await db.xpEvents
        .where("at")
        .aboveOrEqual(start.toISOString())
        .toArray();
      return events.reduce((s, e) => s + Math.max(0, e.amount), 0);
    }, []) ?? 0
  );
}

/* ---- Companion mood: derived from today's consistency ---- */
export type BuddyMood = "rest" | "content" | "happy" | "proud";

export function companionMood(input: {
  checkedIn: boolean;
  dueHabits: number;
  doneHabits: number;
  tasksCompletedToday: number;
}): BuddyMood {
  const { checkedIn, dueHabits, doneHabits, tasksCompletedToday } = input;
  const allHabits = dueHabits > 0 && doneHabits >= dueHabits;
  const anyActivity = checkedIn || doneHabits > 0 || tasksCompletedToday > 0;
  if (allHabits && checkedIn) return "proud";
  if (allHabits || tasksCompletedToday >= 3) return "happy";
  if (anyActivity) return "content";
  return "rest";
}

/** Growth stage from level: 1 sprout · 2 leafy · 3 blooming */
export function growthStage(level: number): 1 | 2 | 3 {
  if (level >= 8) return 3;
  if (level >= 4) return 2;
  return 1;
}
