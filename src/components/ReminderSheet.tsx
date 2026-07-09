import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type ReminderEntry } from "../db";
import { useUI } from "../store";
import { effectiveReminders, loadNotifPrefs, taskAnchorISO } from "../lib/notify";
import ReminderPicker from "./ReminderPicker";

/* Per-item reminder picker — opens for a task or event, edits its
   reminders (each an offset in minutes before the anchor time, plus an
   optional custom message). */
export default function ReminderSheet() {
  const { reminderTarget, openReminders, showToast } = useUI();
  const kind = reminderTarget?.kind;
  const id = reminderTarget?.id;

  const task = useLiveQuery(
    () => (kind === "task" && id ? db.tasks.get(id) : undefined),
    [kind, id]
  );
  const event = useLiveQuery(
    () => (kind === "event" && id ? db.events.get(id) : undefined),
    [kind, id]
  );

  const [sel, setSel] = useState<ReminderEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const item = kind === "task" ? task : kind === "event" ? event : undefined;
  const anchorISO =
    kind === "task" && task ? taskAnchorISO(task) : kind === "event" && event ? event.start : null;

  useEffect(() => {
    setLoaded(false);
  }, [kind, id]);

  useEffect(() => {
    if (!reminderTarget || !item || loaded) return;
    (async () => {
      const prefs = await loadNotifPrefs();
      setSel(effectiveReminders(item.reminders, prefs));
      setLoaded(true);
    })();
  }, [reminderTarget, item, loaded]);

  if (!reminderTarget) return null;
  const close = () => openReminders(null);

  async function save() {
    if (kind === "task" && id) await db.tasks.update(id, { reminders: sel });
    if (kind === "event" && id) await db.events.update(id, { reminders: sel });
    showToast(sel.length ? `${sel.length} reminder${sel.length > 1 ? "s" : ""} set` : "Reminders cleared");
    close();
  }

  return (
    <>
      <div className="overlay" onClick={close} />
      <div className="sheet" role="dialog" aria-label="Reminders">
        <div className="grab" />
        <h3>Remind me</h3>

        <ReminderPicker anchorISO={anchorISO} value={sel} onChange={setSel} />

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {anchorISO && sel.length > 0 && (
            <button className="btn ghost" style={{ flex: 1 }} onClick={() => setSel([])}>
              Clear
            </button>
          )}
          <button className="btn primary" style={{ flex: 2 }} onClick={save} disabled={!anchorISO}>
            Done
          </button>
        </div>
      </div>
    </>
  );
}
