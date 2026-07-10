import Dexie, { type EntityTable } from "dexie";

/* ============ Entity types ============ */

export type Priority = 0 | 1 | 2 | 3; // 0 none · 1 low · 2 medium · 3 high

/** A single reminder: minutes before the item's anchor time (negative =
    after, 0 = at the time), with an optional custom notification message.
    Legacy data may still hold plain numbers — normalize with
    notify.ts's normalizeReminders()/effectiveReminders() before use. */
export interface ReminderEntry {
  offsetMin?: number; // minutes before anchor (relative mode) — omit when atISO is set
  atISO?: string; // absolute fire time, independent of the item's anchor (free/custom mode)
  message?: string;
}
export type StoredReminder = number | ReminderEntry;

export interface Task {
  id: number;
  title: string;
  notes?: string;
  projectId?: number;
  priority: Priority;
  dueDate?: string; // YYYY-MM-DD (local)
  scheduledAt?: string; // ISO local datetime — puts it on the timeline
  durationMin?: number;
  reminders?: StoredReminder[]; // undefined = use the default lead-time
  parentId: number; // 0 = root task, otherwise subtask of that id
  done: boolean;
  completedAt?: string; // ISO
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  name: string;
  color: string;
  archived: boolean;
}

export interface EventItem {
  id: number;
  title: string;
  start: string; // ISO local datetime
  end: string;
  allDay: boolean;
  reminders?: StoredReminder[]; // undefined = use the default lead-time
}

export type HabitSchedule =
  | { kind: "daily" }
  | { kind: "timesPerWeek"; n: number }
  | { kind: "weekdays"; days: number[] }; // 0=Sun … 6=Sat

export interface Habit {
  id: number;
  name: string;
  type: "build" | "break";
  schedule: HabitSchedule;
  preferredTime?: string; // HH:mm — optional slot on the timeline
  icon?: string; // optional emoji shown next to the name
  order?: number; // manual sort position within its status bucket
  archived: boolean;
  createdAt: string;
}

export interface HabitLog {
  id: number;
  habitId: number;
  date: string; // YYYY-MM-DD
  status: "done" | "skipped";
}

export interface CheckIn {
  id: number;
  date: string; // YYYY-MM-DD
  mood: number; // 1–5
  energy: number; // 1–5
  note?: string;
  createdAt: string;
}

export interface FocusSession {
  id: number;
  taskId?: number;
  start: string;
  end?: string;
  plannedMin: number;
  actualMin?: number;
  completed: boolean;
}

export interface XPEvent {
  id: number;
  source: string; // "task" | "habit" | "checkin" | "focus" | …
  amount: number;
  at: string;
}

export interface KV {
  key: string;
  value: unknown;
}

/* ============ Database ============ */

export const db = new Dexie("lifeos") as Dexie & {
  tasks: EntityTable<Task, "id">;
  projects: EntityTable<Project, "id">;
  events: EntityTable<EventItem, "id">;
  habits: EntityTable<Habit, "id">;
  habitLogs: EntityTable<HabitLog, "id">;
  checkins: EntityTable<CheckIn, "id">;
  focusSessions: EntityTable<FocusSession, "id">;
  xpEvents: EntityTable<XPEvent, "id">;
  kv: Dexie.Table<KV, string>;
};

db.version(1).stores({
  tasks: "++id, parentId, projectId, dueDate, scheduledAt",
  projects: "++id",
  events: "++id, start",
  habits: "++id",
  habitLogs: "++id, habitId, date, [habitId+date]",
  checkins: "++id, date",
  focusSessions: "++id, taskId, start",
  xpEvents: "++id, at",
  kv: "key",
});

/* ============ Small helpers ============ */

export const nowISO = () => new Date().toISOString();

export async function addTask(
  partial: Partial<Task> & { title: string }
): Promise<number> {
  return db.tasks.add({
    priority: 0,
    parentId: 0,
    done: false,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    ...partial,
  } as Task);
}

export async function updateTask(id: number, changes: Partial<Task>) {
  await db.tasks.update(id, { ...changes, updatedAt: nowISO() });
}

export async function toggleTask(task: Task) {
  const nowDone = !task.done;
  await updateTask(task.id, {
    done: nowDone,
    completedAt: nowDone ? nowISO() : undefined,
  });
  // XP: +on complete, compensating − on undo (audit trail stays intact)
  const source = task.parentId === 0 ? "task" : "subtask";
  const amount = (task.parentId === 0 ? 10 : 5) * (nowDone ? 1 : -1);
  await db.xpEvents.add({ source, amount, at: nowISO() } as never);
}

export async function deleteTaskDeep(id: number) {
  await db.tasks.where("parentId").equals(id).delete();
  await db.tasks.delete(id);
}

export async function getFlag<T>(key: string): Promise<T | undefined> {
  const row = await db.kv.get(key);
  return row?.value as T | undefined;
}

export async function setFlag(key: string, value: unknown) {
  await db.kv.put({ key, value });
}

export async function wipeAll() {
  await Promise.all(db.tables.map((t) => t.clear()));
}
