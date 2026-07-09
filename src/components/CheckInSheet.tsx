import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, nowISO } from "../db";
import { todayStr } from "../lib/dates";
import { useUI } from "../store";
import { MoodFace, MOOD_WORDS, ENERGY_WORDS } from "./mood";

type Scale = 1 | 2 | 3 | 4 | 5;
const SCALE: Scale[] = [1, 2, 3, 4, 5];

/** The 30-second check-in: two taps + optional line. */
export default function CheckInSheet() {
  const { checkInOpen, setCheckInOpen, showToast } = useUI();
  const today = todayStr();
  const existing = useLiveQuery(
    () => db.checkins.where("date").equals(today).first(),
    [today]
  );

  const [mood, setMood] = useState<Scale | 0>(0);
  const [energy, setEnergy] = useState<Scale | 0>(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (checkInOpen) {
      setMood((existing?.mood as Scale) ?? 0);
      setEnergy((existing?.energy as Scale) ?? 0);
      setNote(existing?.note ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkInOpen]);

  if (!checkInOpen) return null;
  const close = () => setCheckInOpen(false);

  async function save() {
    if (!mood || !energy) return;
    if (existing) {
      await db.checkins.update(existing.id, { mood, energy, note: note || undefined });
    } else {
      await db.checkins.add({
        date: today,
        mood,
        energy,
        note: note || undefined,
        createdAt: nowISO(),
      } as never);
      await db.xpEvents.add({ source: "checkin", amount: 10, at: nowISO() } as never);
      showToast("Checked in · +10 XP");
    }
    close();
  }

  return (
    <>
      <div className="overlay" onClick={close} />
      <div className="sheet" role="dialog" aria-label="Daily check-in">
        <div className="grab" />
        <h3>How are you doing?</h3>

        <div className="field">
          <label>Mood {mood ? `· ${MOOD_WORDS[mood]}` : ""}</label>
          <div className="mood-row">
            {SCALE.map((v) => (
              <button
                key={v}
                className={`mood-btn ${mood === v ? "on" : ""}`}
                aria-label={MOOD_WORDS[v]}
                onClick={() => setMood(v)}
              >
                <MoodFace v={v} />
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Energy {energy ? `· ${ENERGY_WORDS[energy]}` : ""}</label>
          <div className="mood-row">
            {SCALE.map((v) => (
              <button
                key={v}
                className={`mood-btn bar ${energy === v ? "on" : ""}`}
                aria-label={ENERGY_WORDS[v]}
                onClick={() => setEnergy(v)}
              >
                <span className="e-bars">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <i key={i} style={{ height: 4 + i * 3, opacity: i <= v ? 1 : 0.25 }} />
                  ))}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>One line, if you like</label>
          <input
            type="text"
            placeholder="What's on your mind…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
        </div>

        <button className="btn primary" style={{ width: "100%" }} disabled={!mood || !energy} onClick={save}>
          {existing ? "Update" : "Done"}
        </button>
      </div>
    </>
  );
}
