import { db, type Task, type Habit, type EventItem, type ReminderEntry, type StoredReminder } from "../db";
import { isDueOn } from "./habits";
import { todayStr } from "./dates";

/* ================================================================
   Reminders. LifeOS has no server, so notifications are best-effort:
   they fire reliably while the app is open, and use the Notification
   Triggers API (TimestampTrigger) for closed-app delivery where the
   browser supports it.

   Per-item reminders are OFFSETS in minutes before an anchor time —
   a task's scheduledAt (or its due date at 09:00) and an event's
   start. Habits fire at their preferredTime. On top of that:
   a morning agenda, an evening check-in nudge, a default lead-time
   for items you haven't customized, and a quiet-hours window.
   ================================================================ */

export interface QuietHours {
  enabled: boolean;
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

export interface DailyNudge {
  enabled: boolean;
  time: string; // "HH:mm"
}

export interface NotifPrefs {
  enabled: boolean;
  tasks: boolean;
  events: boolean;
  habits: boolean;
  /** offset (min) auto-applied to timed items with no explicit reminders; -1 = none */
  defaultLeadMin: number;
  quietHours: QuietHours;
  agenda: DailyNudge; // morning summary
  checkin: DailyNudge; // evening check-in nudge
}

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  enabled: false,
  tasks: true,
  events: true,
  habits: true,
  defaultLeadMin: 10,
  quietHours: { enabled: false, start: "22:00", end: "07:00" },
  agenda: { enabled: false, time: "08:00" },
  checkin: { enabled: false, time: "21:00" },
};

/** Preset offsets offered in the per-item reminder picker. */
export const REMINDER_PRESETS: { min: number; label: string }[] = [
  { min: 0, label: "At the time" },
  { min: 5, label: "5 min before" },
  { min: 10, label: "10 min before" },
  { min: 30, label: "30 min before" },
  { min: 60, label: "1 hour before" },
  { min: 120, label: "2 hours before" },
  { min: 1440, label: "1 day before" },
];

/** How far ahead the in-app scheduler will arm timers (covers 1-day-before). */
const HORIZON_MS = 36 * 60 * 60 * 1000;
export const DEFAULT_DAY_HOUR = "09:00"; // anchor for date-only tasks

/* ---------------- permission + delivery ---------------- */
export function notifSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}
export function notifPermission(): NotificationPermission {
  return notifSupported() ? Notification.permission : "denied";
}
export async function requestNotifPermission(): Promise<NotificationPermission> {
  if (!notifSupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}
async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    return null;
  }
}

/* ---------------- time helpers ---------------- */
export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function isoMs(iso: string): number {
  return new Date(iso).getTime();
}
function dayTimeMs(dayStr: string, hhmm: string): number {
  const [y, m, d] = dayStr.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
}

/** Anchor datetime (ISO local) a task's reminders count back from. */
export function taskAnchorISO(t: Task): string | null {
  if (t.scheduledAt) return t.scheduledAt;
  if (t.dueDate) return `${t.dueDate}T${DEFAULT_DAY_HOUR}:00`;
  return null;
}

/** Normalizes legacy plain-number reminders (Phase 7) into the current
    { offsetMin, message? } shape. */
export function normalizeReminders(raw: StoredReminder[] | undefined): ReminderEntry[] {
  if (!raw) return [];
  return raw.map((r) => (typeof r === "number" ? { offsetMin: r } : r));
}

/** Explicit reminders, or the default lead-time when the item is untouched. */
export function effectiveReminders(
  explicit: StoredReminder[] | undefined,
  prefs: NotifPrefs
): ReminderEntry[] {
  if (explicit !== undefined) return normalizeReminders(explicit);
  return prefs.defaultLeadMin >= 0 ? [{ offsetMin: prefs.defaultLeadMin }] : [];
}

/** Push a fire time out of the quiet-hours window to when it ends. */
export function shiftOutOfQuiet(atMs: number, q: QuietHours): number {
  if (!q.enabled) return atMs;
  const s = toMin(q.start);
  const e = toMin(q.end);
  if (s === e) return atMs; // empty/degenerate window
  const d = new Date(atMs);
  const mins = d.getHours() * 60 + d.getMinutes();
  const inQuiet = s < e ? mins >= s && mins < e : mins >= s || mins < e;
  if (!inQuiet) return atMs;
  const end = new Date(atMs);
  end.setHours(Math.floor(e / 60), e % 60, 0, 0);
  // wrapping window and we're in the late-night portion → end is next day
  if (s > e && mins >= s) end.setDate(end.getDate() + 1);
  return end.getTime();
}

/* ---------------- reminder building ---------------- */
export interface Reminder {
  id: string;
  at: number; // epoch ms (already quiet-hours adjusted)
  title: string;
  body: string;
  tag: string;
}

export interface ScheduleInput {
  tasks: Task[];
  events: EventItem[];
  habits: Habit[];
  loggedHabitIds: Set<number>;
  checkedInToday: boolean;
  prefs: NotifPrefs;
  now?: number;
}

export function buildSchedule(input: ScheduleInput): Reminder[] {
  const { tasks, events, habits, loggedHabitIds, checkedInToday, prefs } = input;
  const now = input.now ?? Date.now();
  const today = todayStr();
  const q = prefs.quietHours;
  const out: Reminder[] = [];

  const add = (r: Omit<Reminder, "at"> & { at: number }) => {
    const at = shiftOutOfQuiet(r.at, q);
    if (at > now && at <= now + HORIZON_MS) out.push({ ...r, at });
  };

  // scheduled tasks
  if (prefs.tasks) {
    for (const t of tasks) {
      if (t.done) continue;
      const anchor = taskAnchorISO(t);
      const anchorMs = anchor ? isoMs(anchor) : null;
      for (const r of effectiveReminders(t.reminders, prefs)) {
        const at = r.atISO
          ? isoMs(r.atISO)
          : anchorMs !== null
          ? anchorMs - (r.offsetMin ?? 0) * 60000
          : null;
        if (at === null) continue;
        add({
          id: `task-${t.id}-${r.atISO ?? r.offsetMin}-${r.message ?? ""}`,
          at,
          title: r.atISO ? "Reminder" : r.offsetMin === 0 ? "Time for a task" : "Coming up",
          body: r.message?.trim() || t.title,
          tag: `task-${t.id}`,
        });
      }
    }
  }

  // events
  if (prefs.events) {
    for (const ev of events) {
      const anchorMs = isoMs(ev.start);
      for (const r of effectiveReminders(ev.reminders, prefs)) {
        const at = r.atISO ? isoMs(r.atISO) : anchorMs - (r.offsetMin ?? 0) * 60000;
        add({
          id: `event-${ev.id}-${r.atISO ?? r.offsetMin}-${r.message ?? ""}`,
          at,
          title: r.atISO ? "Reminder" : r.offsetMin === 0 ? "Now" : "Coming up",
          body: r.message?.trim() || ev.title,
          tag: `event-${ev.id}`,
        });
      }
    }
  }

  // habits — at preferred time, if due today and not yet logged
  if (prefs.habits) {
    for (const h of habits) {
      if (h.archived || !h.preferredTime) continue;
      if (!isDueOn(h, today) || loggedHabitIds.has(h.id)) continue;
      add({
        id: `habit-${h.id}`,
        at: dayTimeMs(today, h.preferredTime),
        title: "A gentle nudge",
        body: `Time for "${h.name}" — whenever you're ready.`,
        tag: `habit-${h.id}`,
      });
    }
  }

  // morning agenda
  if (prefs.agenda.enabled) {
    const taskCount = tasks.filter(
      (t) => !t.done && (t.dueDate === today || t.scheduledAt?.slice(0, 10) === today)
    ).length;
    const eventCount = events.filter((e) => e.start.slice(0, 10) === today).length;
    const habitCount = habits.filter(
      (h) => !h.archived && isDueOn(h, today) && !loggedHabitIds.has(h.id)
    ).length;
    const parts: string[] = [];
    if (taskCount) parts.push(`${taskCount} task${taskCount > 1 ? "s" : ""}`);
    if (eventCount) parts.push(`${eventCount} event${eventCount > 1 ? "s" : ""}`);
    if (habitCount) parts.push(`${habitCount} habit${habitCount > 1 ? "s" : ""}`);
    add({
      id: "agenda",
      at: dayTimeMs(today, prefs.agenda.time),
      title: "Your day, gently",
      body: parts.length ? `Today: ${parts.join(" · ")}.` : "A clear day ahead. Enjoy it.",
      tag: "agenda",
    });
  }

  // evening check-in nudge — only if not already checked in
  if (prefs.checkin.enabled && !checkedInToday) {
    add({
      id: "checkin",
      at: dayTimeMs(today, prefs.checkin.time),
      title: "How did today feel?",
      body: "A 30-second check-in — mood and energy, that's all.",
      tag: "checkin",
    });
  }

  return out.sort((a, b) => a.at - b.at);
}

/* ---------------- firing ---------------- */
async function fire(r: Reminder) {
  const opts: NotificationOptions = {
    body: r.body,
    tag: r.tag,
    icon: "./icon-192.png",
    badge: "./icon-192.png",
  };
  const reg = await getRegistration();
  if (reg) await reg.showNotification(r.title, opts);
  else if (notifSupported()) new Notification(r.title, opts);
}

async function scheduleWithTrigger(r: Reminder): Promise<boolean> {
  const Trigger = (window as unknown as { TimestampTrigger?: new (t: number) => unknown })
    .TimestampTrigger;
  if (!Trigger) return false;
  const reg = await getRegistration();
  if (!reg) return false;
  try {
    const opts = {
      body: r.body,
      tag: r.tag,
      icon: "./icon-192.png",
      showTrigger: new Trigger(r.at),
    } as NotificationOptions;
    await reg.showNotification(r.title, opts);
    return true;
  } catch {
    return false;
  }
}

/** Arm the given reminders; returns a cleanup that cancels pending timers. */
export async function scheduleReminders(reminders: Reminder[]): Promise<() => void> {
  const timers: ReturnType<typeof setTimeout>[] = [];
  for (const r of reminders) {
    if (await scheduleWithTrigger(r)) continue;
    const delay = r.at - Date.now();
    if (delay <= 0) continue;
    if (delay > HORIZON_MS) continue;
    timers.push(setTimeout(() => void fire(r), delay));
  }
  return () => timers.forEach(clearTimeout);
}

/* ---------------- prefs persistence (kv) ---------------- */
export async function loadNotifPrefs(): Promise<NotifPrefs> {
  const row = await db.kv.get("notifPrefs");
  const stored = (row?.value as Partial<NotifPrefs>) ?? {};
  return {
    ...DEFAULT_NOTIF_PREFS,
    ...stored,
    quietHours: { ...DEFAULT_NOTIF_PREFS.quietHours, ...(stored.quietHours ?? {}) },
    agenda: { ...DEFAULT_NOTIF_PREFS.agenda, ...(stored.agenda ?? {}) },
    checkin: { ...DEFAULT_NOTIF_PREFS.checkin, ...(stored.checkin ?? {}) },
  };
}
export async function saveNotifPrefs(prefs: NotifPrefs): Promise<void> {
  await db.kv.put({ key: "notifPrefs", value: prefs });
}
