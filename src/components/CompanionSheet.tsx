import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { todayStr, dayOfISO } from "../lib/dates";
import { isDueOn, logFor } from "../lib/habits";
import { companionMood, growthStage, useLevel, useTodayXP } from "../lib/xp";
import { useUI } from "../store";
import Buddy from "./Buddy";

const SOURCE_LABEL: Record<string, string> = {
  task: "Task completed",
  subtask: "Subtask completed",
  habit: "Habit kept",
  checkin: "Checked in",
};

export default function CompanionSheet() {
  const { companionOpen, setCompanionOpen } = useUI();
  const level = useLevel();
  const todayXP = useTodayXP();
  const today = todayStr();

  const habits =
    useLiveQuery(() => db.habits.filter((h) => !h.archived).toArray(), []) ?? [];
  const habitLogs = useLiveQuery(() => db.habitLogs.toArray(), []) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const checkin = useLiveQuery(
    () => db.checkins.where("date").equals(today).first(),
    [today]
  );
  const recent =
    useLiveQuery(
      () => db.xpEvents.orderBy("at").reverse().limit(8).toArray(),
      []
    ) ?? [];

  if (!companionOpen) return null;
  const close = () => setCompanionOpen(false);

  const due = habits.filter((h) => isDueOn(h, today));
  const doneHabits = due.filter((h) => logFor(habitLogs, h.id, today)).length;
  const completedToday = tasks.filter(
    (t) => t.done && t.completedAt && dayOfISO(t.completedAt) === today
  ).length;

  const mood = companionMood({
    checkedIn: !!checkin,
    dueHabits: due.length,
    doneHabits,
    tasksCompletedToday: completedToday,
  });

  const moodLine =
    mood === "proud"
      ? "Glowing — you showed up for everything today."
      : mood === "happy"
      ? "Very pleased with how today is going."
      : mood === "content"
      ? "Content. Every small step counts."
      : "Resting until you're ready. No rush.";

  return (
    <>
      <div className="overlay" onClick={close} />
      <div className="sheet" role="dialog" aria-label="Your companion">
        <div className="grab" />
        <div className="companion-hero">
          <Buddy size={96} mood={mood} stage={growthStage(level.level)} />
          <p className="companion-line">{moodLine}</p>
        </div>

        <div className="lvl-row">
          <span className="lvl-big">Level {level.level}</span>
          <span className="lvl-xp">
            {level.intoLevel} / {level.need} XP
            {todayXP > 0 ? ` · +${todayXP} today` : ""}
          </span>
        </div>
        <div className="xpbar-big">
          <i style={{ width: `${Math.round(level.frac * 100)}%` }} />
        </div>

        {recent.length > 0 && (
          <div className="field" style={{ marginTop: 18 }}>
            <label>Recent</label>
            {recent.map((e) => (
              <div className="xp-row" key={e.id}>
                <span>
                  {SOURCE_LABEL[e.source] ?? e.source}
                  {e.amount < 0 ? " (undone)" : ""}
                </span>
                <b className={e.amount < 0 ? "neg" : ""}>
                  {e.amount > 0 ? `+${e.amount}` : e.amount}
                </b>
              </div>
            ))}
          </div>
        )}

        <button className="btn primary" style={{ width: "100%", marginTop: 8 }} onClick={close}>
          Back to it
        </button>
      </div>
    </>
  );
}
