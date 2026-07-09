import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, nowISO, type Habit, type HabitSchedule } from "../db";
import { useUI } from "../store";
import { IconTrash } from "./icons";

const WD = [
  { d: 1, l: "M" },
  { d: 2, l: "T" },
  { d: 3, l: "W" },
  { d: 4, l: "T" },
  { d: 5, l: "F" },
  { d: 6, l: "S" },
  { d: 0, l: "S" },
];

const ICONS = [
  "💪", "🏃", "📖", "🧘", "💧", "🥗", "😴", "🚭",
  "🎨", "🎯", "💰", "🧹", "🪥", "☕", "📵", "🌱",
  "✍️", "🙏",
];

type Kind = HabitSchedule["kind"];

/** Create (habitSheet === "new") or edit (habitSheet === id) a habit. */
export default function HabitSheet() {
  const { habitSheet, openHabitSheet } = useUI();
  const editing = useLiveQuery(
    () => (typeof habitSheet === "number" ? db.habits.get(habitSheet) : undefined),
    [habitSheet]
  );

  const [name, setName] = useState("");
  const [type, setType] = useState<Habit["type"]>("build");
  const [kind, setKind] = useState<Kind>("daily");
  const [n, setN] = useState(3);
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [time, setTime] = useState("");
  const [icon, setIcon] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (habitSheet === "new") {
      setName("");
      setType("build");
      setKind("daily");
      setN(3);
      setDays([1, 3, 5]);
      setTime("");
      setIcon(undefined);
    } else if (editing) {
      setName(editing.name);
      setType(editing.type);
      setKind(editing.schedule.kind);
      if (editing.schedule.kind === "timesPerWeek") setN(editing.schedule.n);
      if (editing.schedule.kind === "weekdays") setDays(editing.schedule.days);
      setTime(editing.preferredTime ?? "");
      setIcon(editing.icon);
    }
  }, [habitSheet, editing]);

  if (habitSheet === null) return null;
  const close = () => openHabitSheet(null);

  const schedule: HabitSchedule =
    kind === "daily"
      ? { kind: "daily" }
      : kind === "timesPerWeek"
      ? { kind: "timesPerWeek", n }
      : { kind: "weekdays", days };

  const valid =
    name.trim().length > 0 && (kind !== "weekdays" || days.length > 0);

  async function save() {
    if (!valid) return;
    const data = {
      name: name.trim(),
      type,
      schedule,
      preferredTime: time || undefined,
      icon: icon || undefined,
    };
    if (typeof habitSheet === "number") {
      await db.habits.update(habitSheet, data);
    } else {
      await db.habits.add({
        ...data,
        archived: false,
        createdAt: nowISO(),
      } as never);
    }
    close();
  }

  return (
    <>
      <div className="overlay" onClick={close} />
      <div className="sheet" role="dialog" aria-label="Habit">
        <div className="grab" />
        <h3>{typeof habitSheet === "number" ? "Edit habit" : "New habit"}</h3>

        <div className="field">
          <label>Name</label>
          <input
            type="text"
            placeholder={type === "break" ? "No phone after 10pm" : "Morning run"}
            value={name}
            autoFocus={habitSheet === "new"}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Icon (optional)</label>
          <div className="icon-picker">
            <button
              className={`icon-opt none ${!icon ? "on" : ""}`}
              aria-label="No icon"
              onClick={() => setIcon(undefined)}
            >
              ×
            </button>
            {ICONS.map((e) => (
              <button
                key={e}
                className={`icon-opt ${icon === e ? "on" : ""}`}
                aria-label={`Choose ${e}`}
                onClick={() => setIcon(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>I want to</label>
          <div className="seg" style={{ width: "100%" }}>
            <button
              className={type === "build" ? "on" : ""}
              style={{ flex: 1 }}
              onClick={() => setType("build")}
            >
              Build this
            </button>
            <button
              className={type === "break" ? "on" : ""}
              style={{ flex: 1 }}
              onClick={() => setType("break")}
            >
              Avoid this
            </button>
          </div>
        </div>

        <div className="field">
          <label>How often</label>
          <div className="seg" style={{ width: "100%" }}>
            <button
              className={kind === "daily" ? "on" : ""}
              style={{ flex: 1 }}
              onClick={() => setKind("daily")}
            >
              Daily
            </button>
            <button
              className={kind === "timesPerWeek" ? "on" : ""}
              style={{ flex: 1 }}
              onClick={() => setKind("timesPerWeek")}
            >
              × per week
            </button>
            <button
              className={kind === "weekdays" ? "on" : ""}
              style={{ flex: 1 }}
              onClick={() => setKind("weekdays")}
            >
              Set days
            </button>
          </div>
        </div>

        {kind === "timesPerWeek" && (
          <div className="field">
            <label>Times per week</label>
            <div className="stepper">
              <button onClick={() => setN(Math.max(1, n - 1))}>−</button>
              <span>{n}</span>
              <button onClick={() => setN(Math.min(6, n + 1))}>+</button>
            </div>
          </div>
        )}

        {kind === "weekdays" && (
          <div className="field">
            <label>On days</label>
            <div className="wd-picker">
              {WD.map((w) => (
                <button
                  key={w.d}
                  className={days.includes(w.d) ? "on" : ""}
                  onClick={() =>
                    setDays((prev) =>
                      prev.includes(w.d)
                        ? prev.filter((x) => x !== w.d)
                        : [...prev, w.d]
                    )
                  }
                >
                  {w.l}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <label>Preferred time (optional — places it on your timeline)</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          {typeof habitSheet === "number" ? (
            <button
              className="btn danger-ghost"
              onClick={async () => {
                await db.habits.update(habitSheet, { archived: true });
                close();
              }}
            >
              <IconTrash size={15} /> Archive
            </button>
          ) : (
            <span />
          )}
          <button className="btn primary" disabled={!valid} onClick={save}>
            Save
          </button>
        </div>
      </div>
    </>
  );
}
