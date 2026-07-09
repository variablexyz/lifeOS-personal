import { useEffect, useMemo, useRef, useState } from "react";
import { addTask, db, type ReminderEntry } from "../db";
import { parseQuickAdd, PRIORITY_LABEL } from "../lib/quickadd";
import { dayLabel, relativePrefix, toLocalISO, todayStr, durLabel } from "../lib/dates";
import { DEFAULT_DAY_HOUR } from "../lib/notify";
import { useUI } from "../store";
import ReminderPicker from "./ReminderPicker";
import { IconBell } from "./icons";

type Kind = "task" | "event";

export default function QuickAddSheet() {
  const { quickAddOpen, setQuickAddOpen, selectedDay } = useUI();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<Kind>("task");
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [reminders, setReminders] = useState<ReminderEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (quickAddOpen) {
      setText("");
      setKind("task");
      setRemindersOpen(false);
      setReminders([]);
      // focus after the sheet animation starts
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [quickAddOpen]);

  const parsed = useMemo(() => parseQuickAdd(text), [text]);

  const fallbackDay = selectedDay !== todayStr() ? selectedDay : undefined;
  const day = parsed.date ?? fallbackDay ?? todayStr();

  // Anchor time reminders count back from — mirrors how the item will
  // actually be saved below, kept in sync so the picker never lies.
  const anchorISO = useMemo(() => {
    if (kind === "task") {
      return parsed.time ? toLocalISO(day, parsed.time) : `${day}T${DEFAULT_DAY_HOUR}:00`;
    }
    return toLocalISO(day, parsed.time ?? "09:00");
  }, [kind, day, parsed.time]);

  if (!quickAddOpen) return null;

  const close = () => setQuickAddOpen(false);

  async function submit() {
    if (!parsed.title.trim()) return;

    if (kind === "task") {
      await addTask({
        title: parsed.title,
        priority: parsed.priority,
        dueDate: day,
        scheduledAt: parsed.time ? toLocalISO(day, parsed.time) : undefined,
        durationMin: parsed.durationMin,
        reminders: reminders.length ? reminders : undefined,
      });
    } else {
      const time = parsed.time ?? "09:00";
      const start = toLocalISO(day, time);
      const dur = parsed.durationMin ?? 60;
      const endDate = new Date(start);
      endDate.setMinutes(endDate.getMinutes() + dur);
      const end = toLocalISO(
        `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`,
        `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`
      );
      await db.events.add({
        title: parsed.title,
        start,
        end,
        allDay: false,
        reminders: reminders.length ? reminders : undefined,
      } as never);
    }
    close();
  }

  const dateChip = parsed.date
    ? relativePrefix(parsed.date) ?? dayLabel(parsed.date)
    : null;

  return (
    <>
      <div className="overlay" onClick={close} />
      <div className="sheet" role="dialog" aria-label="Quick add">
        <div className="grab" />
        <div className="seg" style={{ marginBottom: 12 }}>
          <button className={kind === "task" ? "on" : ""} onClick={() => setKind("task")}>
            Task
          </button>
          <button className={kind === "event" ? "on" : ""} onClick={() => setKind("event")}>
            Event
          </button>
        </div>
        <input
          ref={inputRef}
          className="qa-input"
          placeholder={kind === "task" ? "gym tomorrow 7am !high" : "Lunch with Sam friday 12:30"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") close();
          }}
          enterKeyHint="done"
        />
        <div className="qa-chips">
          {dateChip && <span className="qa-chip">{dateChip}</span>}
          {parsed.time && <span className="qa-chip">{parsed.time}</span>}
          {parsed.durationMin ? <span className="qa-chip">{durLabel(parsed.durationMin)}</span> : null}
          {parsed.priority > 0 && (
            <span className="qa-chip">{PRIORITY_LABEL[parsed.priority]}</span>
          )}
        </div>
        <p className="qa-hint">
          Try “call mom tomorrow 6pm” · “!high” sets priority · “for 45m” sets length
        </p>

        <button
          type="button"
          className={`rem-btn ${reminders.length ? "has" : ""}`}
          style={{ marginTop: 12 }}
          onClick={() => setRemindersOpen((o) => !o)}
        >
          <IconBell />
          {reminders.length
            ? `${reminders.length} reminder${reminders.length > 1 ? "s" : ""}`
            : "Remind me…"}
        </button>
        {remindersOpen && (
          <div style={{ marginTop: 10 }}>
            <ReminderPicker anchorISO={anchorISO} value={reminders} onChange={setReminders} />
          </div>
        )}

        <div className="qa-actions">
          <button className="btn ghost" onClick={close}>
            Cancel
          </button>
          <button className="btn primary" disabled={!parsed.title.trim()} onClick={submit}>
            {kind === "task" ? "Add task" : "Add event"}
          </button>
        </div>
      </div>
    </>
  );
}
