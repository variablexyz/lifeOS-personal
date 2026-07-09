import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { dayOfISO, timeLabel, toLocalISO } from "../lib/dates";
import { useUI } from "../store";
import { IconBell, IconTrash } from "./icons";

export default function EventSheet() {
  const { detailEventId, openEvent, openReminders } = useUI();
  const event = useLiveQuery(
    () => (detailEventId ? db.events.get(detailEventId) : undefined),
    [detailEventId]
  );

  if (!detailEventId || !event) return null;
  const close = () => openEvent(null);

  const day = dayOfISO(event.start);
  const startT = timeLabel(event.start).padStart(5, "0");
  const endT = timeLabel(event.end).padStart(5, "0");

  return (
    <>
      <div className="overlay" onClick={close} />
      <div className="sheet" role="dialog" aria-label="Event details">
        <div className="grab" />
        <div className="field">
          <label>Event</label>
          <input
            type="text"
            value={event.title}
            onChange={(e) => db.events.update(event.id, { title: e.target.value })}
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Date</label>
            <input
              type="date"
              value={day}
              onChange={(e) => {
                if (!e.target.value) return;
                db.events.update(event.id, {
                  start: toLocalISO(e.target.value, startT),
                  end: toLocalISO(e.target.value, endT),
                });
              }}
            />
          </div>
          <div className="field">
            <label>Start</label>
            <input
              type="time"
              value={startT}
              onChange={(e) =>
                e.target.value &&
                db.events.update(event.id, { start: toLocalISO(day, e.target.value) })
              }
            />
          </div>
          <div className="field">
            <label>End</label>
            <input
              type="time"
              value={endT}
              onChange={(e) =>
                e.target.value &&
                db.events.update(event.id, { end: toLocalISO(day, e.target.value) })
              }
            />
          </div>
        </div>
        <div className="field">
          <label>Reminders</label>
          <button
            className={`rem-btn ${event.reminders && event.reminders.length ? "has" : ""}`}
            onClick={() => openReminders({ kind: "event", id: event.id })}
          >
            <IconBell />
            {event.reminders && event.reminders.length
              ? `${event.reminders.length} reminder${event.reminders.length > 1 ? "s" : ""}`
              : "Add a reminder"}
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <button
            className="btn danger-ghost"
            onClick={async () => {
              await db.events.delete(event.id);
              close();
            }}
          >
            <IconTrash size={15} /> Delete
          </button>
          <button className="btn primary" onClick={close}>
            Done
          </button>
        </div>
      </div>
    </>
  );
}
