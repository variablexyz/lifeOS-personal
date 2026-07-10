import { useState } from "react";
import { REMINDER_PRESETS } from "../lib/notify";
import type { ReminderEntry } from "../db";

/* Shared reminder composer — used by ReminderSheet (editing an existing
   item) and QuickAddSheet (setting reminders at creation time). Kept
   deliberately light on visible options: one dropdown (a few common
   relative presets + "Set a specific time…"), not a wall of chips.
   Picking "Set a specific time…" reveals a free date+time picker that
   is NOT anchored to the item's due/start time at all — you can pick
   any moment, even if the task/event has no date set yet. */

const CUSTOM = "custom";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toLocalValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A sensible default for the free time picker: an hour from the anchor
    (or from now, if there's no anchor), rounded to the next 5 minutes. */
function defaultLocalValue(baseMs: number): string {
  const d = new Date(baseMs + 60 * 60000);
  const rem = d.getMinutes() % 5;
  if (rem) d.setMinutes(d.getMinutes() + (5 - rem));
  return toLocalValue(d);
}

function fmtEntry(anchorMs: number | null, r: ReminderEntry): string {
  if (r.atISO) {
    const d = new Date(r.atISO);
    const sameDay = d.toDateString() === new Date().toDateString();
    const day = sameDay ? "Today" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${day}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  const min = r.offsetMin ?? 0;
  const label = min === 0 ? "At the time" : min < 0 ? `${Math.abs(min)} min after` : `${min} min before`;
  if (anchorMs === null) return label;
  const t = new Date(anchorMs - min * 60000);
  return `${label} (${pad(t.getHours())}:${pad(t.getMinutes())})`;
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
  const [preset, setPreset] = useState<string>(anchorMs !== null ? String(REMINDER_PRESETS[2]?.min ?? 10) : CUSTOM);
  const [customAt, setCustomAt] = useState(() => defaultLocalValue(anchorMs ?? Date.now()));
  const [message, setMessage] = useState("");

  const useCustom = anchorMs === null || preset === CUSTOM;

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const add = () => {
    const msg = message.trim() || undefined;
    let entry: ReminderEntry;
    if (useCustom) {
      if (!customAt) return;
      entry = { atISO: `${customAt}:00`, message: msg };
    } else {
      entry = { offsetMin: Number(preset), message: msg };
    }
    onChange([...value, entry]);
    setMessage("");
  };

  return (
    <>
      <div className="rem-compose">
        <select
          className="set-select rem-select"
          value={anchorMs === null ? CUSTOM : preset}
          onChange={(e) => setPreset(e.target.value)}
          disabled={anchorMs === null}
        >
          {anchorMs !== null &&
            REMINDER_PRESETS.map((p) => (
              <option key={p.min} value={String(p.min)}>
                {p.label}
              </option>
            ))}
          <option value={CUSTOM}>Set a specific time…</option>
        </select>

        {useCustom && (
          <input
            type="datetime-local"
            className="rem-datetime-input"
            value={customAt}
            onChange={(e) => setCustomAt(e.target.value)}
          />
        )}

        <input
          type="text"
          className="rem-msg-input"
          placeholder="Custom message (optional) — defaults to the title"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />

        <button type="button" className="btn ghost" style={{ width: "100%" }} onClick={add}>
          Add reminder
        </button>
      </div>

      {value.length > 0 && (
        <div className="rem-selected">
          {value.map((r, i) => (
            <button
              type="button"
              className="qa-chip rem-pill"
              key={i}
              onClick={() => remove(i)}
              aria-label="Remove reminder"
            >
              {fmtEntry(anchorMs, r)}
              {r.message && <i className="rem-pill-msg">&ldquo;{r.message}&rdquo;</i>}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
