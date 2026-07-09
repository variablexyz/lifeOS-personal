import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Habit } from "../db";
import {
  computeStreak,
  currentMilestone,
  habitBucket,
  logFor,
  scheduleLabel,
  skipHabitLog,
  streakLabel,
  toggleHabitLog,
  weekProgress,
  isDueOn,
  type HabitBucket,
} from "../lib/habits";
import { todayStr } from "../lib/dates";
import { useUI } from "../store";
import HabitHistory from "../components/HabitHistory";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconFlame,
  IconMedal,
  IconMoon,
  IconPlus,
  IconRepeat,
} from "../components/icons";

type Filter = "all" | "due" | "build" | "avoid";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "due", label: "Today" },
  { id: "build", label: "Build" },
  { id: "avoid", label: "Avoid" },
];

const BUCKET_RANK: Record<HabitBucket, number> = { needs: 0, settled: 1, resting: 2 };

export default function Habits() {
  const { openHabitSheet } = useUI();
  const today = todayStr();
  const [filter, setFilter] = useState<Filter>("all");

  const allHabits =
    useLiveQuery(() => db.habits.filter((h) => !h.archived).toArray(), []) ?? [];
  const logs = useLiveQuery(() => db.habitLogs.toArray(), []) ?? [];

  const bucketOf = useMemo(() => {
    const m = new Map<number, HabitBucket>();
    for (const h of allHabits) m.set(h.id, habitBucket(h, logs, today));
    return m;
  }, [allHabits, logs, today]);

  // today's overall progress — always reflects everything, not the filter
  const inPlay = allHabits.filter((h) => bucketOf.get(h.id) !== "resting");
  const settledCount = inPlay.filter((h) => bucketOf.get(h.id) === "settled").length;

  const matchesFilter = (h: Habit) => {
    if (filter === "all") return true;
    if (filter === "build") return h.type === "build";
    if (filter === "avoid") return h.type === "break";
    return bucketOf.get(h.id) !== "resting"; // "due"
  };

  const visible = allHabits
    .filter(matchesFilter)
    .sort((a, b) => {
      const ba = BUCKET_RANK[bucketOf.get(a.id)!];
      const bb = BUCKET_RANK[bucketOf.get(b.id)!];
      if (ba !== bb) return ba - bb;
      const oa = a.order ?? Infinity;
      const ob = b.order ?? Infinity;
      if (oa !== ob) return oa - ob;
      return a.createdAt.localeCompare(b.createdAt);
    });

  async function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= visible.length) return;
    if (bucketOf.get(visible[index].id) !== bucketOf.get(visible[j].id)) return;
    await Promise.all(visible.map((h, i) => db.habits.update(h.id, { order: i })));
    await db.habits.update(visible[index].id, { order: j });
    await db.habits.update(visible[j].id, { order: index });
  }

  return (
    <div className="screen">
      <header className="header">
        <div>
          <div className="kicker">Small things, kept gently</div>
          <h1>Habits</h1>
        </div>
        <div className="day-nav">
          <button
            className="today-btn"
            onClick={() => openHabitSheet("new")}
            aria-label="New habit"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <IconPlus size={14} /> New
          </button>
        </div>
      </header>

      {allHabits.length === 0 ? (
        <div className="placeholder">
          <div className="ph-icon">
            <IconRepeat size={26} />
          </div>
          <h2>No habits yet</h2>
          <p>Start with one small thing — daily, a few times a week, or set days.</p>
        </div>
      ) : (
        <>
          <div className="hab-summary">
            {inPlay.length === 0 ? (
              <p>Nothing due today — a quiet day.</p>
            ) : (
              <>
                <p>
                  <b>{settledCount}</b> of {inPlay.length} done today
                </p>
                <div className="prog">
                  <i style={{ width: `${Math.round((settledCount / inPlay.length) * 100)}%` }} />
                </div>
              </>
            )}
          </div>

          <div className="seg hab-filter">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={filter === f.id ? "on" : ""}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="empty">
              No habits in this view
              <div className="hint">Try a different filter above</div>
            </div>
          ) : (
            visible.map((h, index) => {
              const streak = computeStreak(h, logs);
              const milestone = currentMilestone(streak);
              const prog = weekProgress(h, logs);
              const todayLog = logFor(logs, h.id, today);
              const bucket = bucketOf.get(h.id)!;
              const dueToday = isDueOn(h, today);
              const isBreak = h.type === "break";
              const meta = [
                scheduleLabel(h),
                prog ? `${prog.done} of ${prog.target} this week` : null,
              ]
                .filter(Boolean)
                .join(" · ");

              const cbState =
                todayLog?.status === "done" ? "done" : todayLog?.status === "skipped" ? "skipped" : "";
              const cbLabel = todayLog
                ? "Undo"
                : isBreak
                ? dueToday
                  ? "Mark avoided today"
                  : "Mark avoided anyway"
                : dueToday
                ? "Log today"
                : "Log anyway";

              const canUp =
                index > 0 && bucketOf.get(visible[index - 1].id) === bucket;
              const canDown =
                index < visible.length - 1 && bucketOf.get(visible[index + 1].id) === bucket;

              return (
                <div
                  className={`card habit-card ${bucket === "resting" ? "resting" : ""}`}
                  key={h.id}
                >
                  <div className="row" onClick={() => openHabitSheet(h.id)}>
                    <button
                      className={`cb ${cbState} ${isBreak ? "break" : ""}`}
                      aria-label={cbLabel}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleHabitLog(h.id, today);
                      }}
                    >
                      {cbState === "skipped" ? <IconMoon size={12} /> : <IconCheck />}
                    </button>
                    <div className="txt">
                      <div className="t">
                        {h.icon ? `${h.icon} ` : ""}
                        {h.name}
                      </div>
                      <div className="m">{meta}</div>
                      {bucket === "needs" && (
                        <button
                          className="link-btn skip-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            skipHabitLog(h.id, today);
                          }}
                        >
                          Skip today
                        </button>
                      )}
                    </div>
                    {streak.value > 0 && (
                      <span className={`chip streak ${milestone ? "milestone" : ""}`}>
                        {milestone ? <IconMedal size={12} /> : <IconFlame />} {streakLabel(streak)}
                      </span>
                    )}
                    <div className="reorder-stack" onClick={(e) => e.stopPropagation()}>
                      <button
                        aria-label="Move up"
                        disabled={!canUp}
                        onClick={() => move(index, -1)}
                      >
                        <IconChevronUp size={13} />
                      </button>
                      <button
                        aria-label="Move down"
                        disabled={!canDown}
                        onClick={() => move(index, 1)}
                      >
                        <IconChevronDown size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="hab-hist-wrap">
                    <HabitHistory habit={h} />
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
