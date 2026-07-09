import { useState } from "react";
import { REMINDER_PRESETS } from "../lib/notify";
import { timeLabel } from "../lib/dates";
import type { ReminderEntry } from "../db";

/* Shared reminder composer — used by ReminderSheet (editing an existing
   item) and QuickAddSheet (setting reminders at creation time, before
   the item exists). Pick a preset to fill the time field with the right
   clock time (no mental math), fine-tune it if needed, optionally add a
   custom message, then Add. Offsets are minutes before the anchor; a
   negative offset means "after". */

function fmtOffset(min: number): string {
  if (min === 0) return "At the time";
  const after = min < 0;
  const abs = Math.abs(min);
  const rel = after ? "after" : "before";
  if (abs % 1440 === 0) {
    const d = abs / 1440;
    return `${d} day${d > 1 ? "s" : ""} ${rel}`;
  }
  if (abs % 60 === 0) {
    const h = abs / 60;
    return `${h} hour${h > 1 ? "s" : ""} ${rel}`;
  }
  return `${abs} min ${rel}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function hhmmAt(anchorMs: number, offsetMin: number): string {
  const d = new Date(anchorMs - offsetMin * 60000);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Nearest offset (± up to 12h) that lands the anchor's day-clock at `hhmm`. */
function timeToOffset(anchorMs: number, hhmm: string): number {
  const [hh, mm] = hhmm.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 0;
  const picked = new Date(anchorMs);
  picked.setHours(hh, mm, 0, 0);
  let diff = anchorMs - picked.getTime();
  const DAY = 24 * 60 * 60 * 1000;
  if (diff > DAY / 2) diff -= DAY;
  if (diff < -DAY / 2) diff += DAY;
  return Math.round(diff / 60000);
}

export default function ReminderPicker({
  anchorISO,
  value,
  onChange,
}: {
  anchorISO: string | null;
  value: ReminderEntry[];
  onChange: (v: ReminderEntry[]) => void;
}) {
  const anchorMs = anchorISO ? new Date(anchorISO).getTime() : null;
  const [time, setTime] = useState(() => (anchorMs !== null ? hhmmAt(anchorMs, 0) : "09:00"));
  const [message, setMessage] = useState("");

  if (anchorISO === null || anchorMs === null) {
    return (
      <p className="qa-hint" style={{ marginTop: 0 }}>
        Add a date or time first, then you can set reminders.
      </p>
    );
  }

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const addAt = (offsetMin: number) => {
    const msg = message.trim() || undefined;
    const exists = value.some((v) => v.offsetMin === offsetMin && v.message === msg);
    if (!exists) {
      onChange([...value, { offsetMin, message: msg }].sort((a, b) => a.offsetMin - b.offsetMin));
    }
    setMessage("");
  };

  return (
    <>
      <p className="qa-hint" style={{ marginTop: 0 }}>
        Anchored to {timeLabel(anchorISO)} on its day — tap a preset to fill the time, or set it directly.
      </p>

      <div className="rem-grid">
        {REMINDER_PRESETS.map((p) => (
          <button
            key={p.min}
            type="button"
            className="rem-chip"
            onClick={() => setTime(hhmmAt(anchorMs, p.min))}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="subtask-add" style={{ marginTop: 10 }}>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <button
          type="button"
          className="btn ghost"
          style={{ padding: "9px 14px" }}
          onClick={() => addAt(timeToOffset(anchorMs, time))}
        >
          Add
        </button>
      </div>
      <input
        type="text"
        className="rem-msg-input"
        placeholder="Custom message (optional) — defaults to the title"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && addAt(timeToOffset(anchorMs, time))}
      />

      {value.length > 0 && (
        <div className="rem-selected">
          {value.map((r, i) => (
            <button
              type="button"
              className="qa-chip rem-pill"
              key={`${r.offsetMin}-${r.message ?? ""}-${i}`}
              onClick={() => remove(i)}
              aria-label={`Remove reminder at ${hhmmAt(anchorMs, r.offsetMin)}`}
            >
              {fmtOffset(r.offsetMin)}
              <b>{hhmmAt(anchorMs, r.offsetMin)}</b>
              {r.message && <i className="rem-pill-msg">&ldquo;{r.message}&rdquo;</i>}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
