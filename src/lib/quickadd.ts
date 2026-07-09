import * as chrono from "chrono-node";
import { toDayStr } from "./dates";
import type { Priority } from "../db";

export interface ParsedQuick {
  title: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm — only when the user actually said a time
  durationMin?: number;
  priority: Priority;
}

const PRI_RE = /(?:^|\s)!(high|h|p1|med|medium|m|p2|low|l|p3)\b/i;
const DUR_RE = /\bfor\s+(\d+(?:\.\d+)?)\s*(minutes?|mins?|m|hours?|hrs?|h)\b/i;

/**
 * "gym tomorrow 7am !high for 45m" →
 * { title:"gym", date:<tomorrow>, time:"07:00", durationMin:45, priority:3 }
 */
export function parseQuickAdd(text: string, ref: Date = new Date()): ParsedQuick {
  let working = text;
  let priority: Priority = 0;
  let durationMin: number | undefined;

  const priMatch = working.match(PRI_RE);
  if (priMatch) {
    const p = priMatch[1].toLowerCase();
    priority = p === "high" || p === "h" || p === "p1" ? 3
      : p === "low" || p === "l" || p === "p3" ? 1 : 2;
    working = working.replace(PRI_RE, " ");
  }

  const durMatch = working.match(DUR_RE);
  if (durMatch) {
    const n = parseFloat(durMatch[1]);
    const unit = durMatch[2].toLowerCase();
    durationMin = Math.round(unit.startsWith("h") ? n * 60 : n);
    working = working.replace(DUR_RE, " ");
  }

  let date: string | undefined;
  let time: string | undefined;
  const results = chrono.parse(working, ref, { forwardDate: true });
  if (results.length > 0) {
    const r = results[0];
    const d = r.start.date();
    date = toDayStr(d);
    if (r.start.isCertain("hour")) {
      time = `${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes()
      ).padStart(2, "0")}`;
    }
    working =
      working.slice(0, r.index) + " " + working.slice(r.index + r.text.length);
  }

  const title = working
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*(at|on|by)\s+|\s+(at|on|by)\s*$/gi, " ")
    .trim();

  return { title, date, time, durationMin, priority };
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  0: "",
  1: "Low",
  2: "Medium",
  3: "High",
};
