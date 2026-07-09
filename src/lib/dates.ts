/* Local-date helpers. All app dates are LOCAL — never UTC — because a
   "day" in a planner means the user's day. */

export function toDayStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return toDayStr(new Date());
}

export function addDays(dayStr: string, n: number): string {
  const d = fromDayStr(dayStr);
  d.setDate(d.getDate() + n);
  return toDayStr(d);
}

export function fromDayStr(dayStr: string): Date {
  const [y, m, d] = dayStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** ISO local datetime (no timezone suffix) from a day string + HH:mm */
export function toLocalISO(dayStr: string, time: string): string {
  return `${dayStr}T${time}:00`;
}

export function dayOfISO(iso: string): string {
  return iso.slice(0, 10);
}

export function timeLabel(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function nowTimeLabel(): string {
  return timeLabel(new Date().toISOString().slice(0, 19));
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "Tuesday, July 7" — or "Tomorrow · Wednesday, July 8" style prefix */
export function dayLabel(dayStr: string): string {
  const d = fromDayStr(dayStr);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function relativePrefix(dayStr: string): string | null {
  const t = todayStr();
  if (dayStr === t) return null;
  if (dayStr === addDays(t, 1)) return "Tomorrow";
  if (dayStr === addDays(t, -1)) return "Yesterday";
  return null;
}

export function greeting(name: string): string {
  const h = new Date().getHours();
  const part = h < 5 ? "Night owl hours" : h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
  return `${part}, ${name}`;
}

/** minutes since midnight for an ISO local datetime */
export function minutesOf(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function durLabel(min?: number): string {
  if (!min) return "";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
