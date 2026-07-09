import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { todayStr } from "../lib/dates";
import {
  buildSchedule,
  loadNotifPrefs,
  notifPermission,
  scheduleReminders,
} from "../lib/notify";

/* Headless: schedules today's reminders (tasks, events, habits, agenda,
   check-in) while the app is open, re-running whenever the underlying
   data or prefs change. Renders nothing. */
export default function Reminders() {
  const tasks = useLiveQuery(() => db.tasks.toArray(), []);
  const events = useLiveQuery(() => db.events.toArray(), []);
  const habits = useLiveQuery(() => db.habits.toArray(), []);
  const prefsRow = useLiveQuery(() => db.kv.get("notifPrefs"), []);
  const todayLogs = useLiveQuery(
    () => db.habitLogs.where("date").equals(todayStr()).toArray(),
    []
  );
  const todayCheckin = useLiveQuery(
    () => db.checkins.where("date").equals(todayStr()).first(),
    []
  );

  useEffect(() => {
    if (!tasks || !events || !habits || !todayLogs) return;
    if (notifPermission() !== "granted") return;

    let cancel: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const prefs = await loadNotifPrefs();
      if (!prefs.enabled) return;
      const loggedHabitIds = new Set(todayLogs.map((l) => l.habitId));
      const reminders = buildSchedule({
        tasks,
        events,
        habits,
        loggedHabitIds,
        checkedInToday: !!todayCheckin,
        prefs,
      });
      const c = await scheduleReminders(reminders);
      if (cancelled) c();
      else cancel = c;
    })();

    return () => {
      cancelled = true;
      cancel?.();
    };
  }, [tasks, events, habits, todayLogs, todayCheckin, prefsRow]);

  return null;
}
