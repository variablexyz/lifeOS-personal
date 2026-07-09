import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { scheduleLabel, streakLabel } from "../lib/habits";
import { computeWeekSummary, type WeekSummary } from "../lib/review";
import { useUI } from "../store";
import { MoodFace, EnergyDots, MOOD_WORDS } from "../components/mood";
import {
  IconCheck,
  IconChart,
  IconFlame,
  IconRepeat,
  IconSettings,
} from "../components/icons";

/* Small SVG line of the week's mood — gaps where there was no check-in. */
function MoodSpark({ mood }: { mood: (number | null)[] }) {
  const W = 120;
  const H = 40;
  const n = mood.length;
  const pts = mood
    .map((m, i) => (m == null ? null : { x: (i / (n - 1)) * W, y: H - 6 - ((m - 1) / 4) * (H - 12), m, i }))
    .filter((p): p is { x: number; y: number; m: number; i: number } => p !== null);

  if (pts.length < 2) {
    return <div className="spark-empty">A day or two more of check-ins will draw your trend.</div>;
  }
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={line} fill="none" stroke="var(--mood-good)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p) => (
        <circle key={p.i} cx={p.x} cy={p.y} r="2.6" fill="var(--mood-good)" />
      ))}
    </svg>
  );
}

function Delta({ value, unit }: { value: number; unit?: string }) {
  if (value === 0) return <span className="stat-d flat">±0{unit ? ` ${unit}` : ""}</span>;
  const up = value > 0;
  return (
    <span className={`stat-d ${up ? "up" : "down"}`}>
      {up ? "↑" : "↓"} {Math.abs(value)}
      {unit ? ` ${unit}` : ""}
    </span>
  );
}

function Content({ s }: { s: WeekSummary }) {
  const maxAct = Math.max(1, ...s.perDayActivity);
  const moodRounded = s.moodAvg == null ? null : (Math.round(s.moodAvg) as 1 | 2 | 3 | 4 | 5);
  const energyRounded = s.energyAvg == null ? null : (Math.round(s.energyAvg) as 1 | 2 | 3 | 4 | 5);
  const moodDelta =
    s.moodAvg != null && s.moodAvgPrev != null
      ? Math.round((s.moodAvg - s.moodAvgPrev) * 10) / 10
      : null;

  return (
    <>
      {/* the one suggestion */}
      <div className={`rev-hero k-${s.suggestion.kind}`}>
        <div className="rev-hero-label">One thing</div>
        <p>{s.suggestion.text}</p>
      </div>

      {/* completions */}
      <div className="stat-grid">
        <div className="stat">
          <div className="stat-top">
            <span className="stat-ic tasks"><IconCheck size={13} /></span>
            <Delta value={s.tasksDone - s.tasksDonePrev} />
          </div>
          <div className="stat-n">{s.tasksDone}</div>
          <div className="stat-l">tasks done</div>
        </div>
        <div className="stat">
          <div className="stat-top">
            <span className="stat-ic habits"><IconRepeat size={14} /></span>
          </div>
          <div className="stat-n">{s.habitsKept}</div>
          <div className="stat-l">habits kept</div>
        </div>
        <div className="stat">
          <div className="stat-top">
            <span className="stat-ic checkin"><MoodFace v={3} size={16} /></span>
          </div>
          <div className="stat-n">{s.checkinCount}</div>
          <div className="stat-l">check-ins</div>
        </div>
      </div>

      {/* activity across the week */}
      <div className="section">
        <h2>How the week moved</h2>
        <div className="card rev-card">
          <div className="bars" aria-label="Activity per day over the last 7 days">
            {s.perDayActivity.map((v, i) => (
              <div className={`bar ${i === s.todayIndex ? "today" : ""}`} key={i}>
                <div className="bar-track">
                  <i style={{ height: `${(v / maxAct) * 100}%` }} title={`${v} on this day`} />
                </div>
                <span className="bar-l">{s.weekdayLabels[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* mood & energy trend */}
      <div className="section">
        <h2>How you felt</h2>
        <div className="card rev-card">
          {s.checkinCount === 0 ? (
            <div className="trend-empty">No check-ins this week. Your mood trend will appear here once you log a day.</div>
          ) : (
            <div className="trend">
              <div className="trend-head">
                <div className="trend-mood">
                  <span className="trend-face"><MoodFace v={moodRounded ?? 3} size={30} /></span>
                  <div>
                    <div className="trend-word">{moodRounded ? MOOD_WORDS[moodRounded] : "—"}</div>
                    <div className="trend-sub">
                      avg mood
                      {moodDelta != null && moodDelta !== 0 && (
                        <span className={moodDelta > 0 ? "up" : "down"}>
                          {" "}{moodDelta > 0 ? "↑" : "↓"} vs last week
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="trend-energy">
                  {energyRounded && <EnergyDots v={energyRounded} />}
                  <div className="trend-sub">avg energy</div>
                </div>
              </div>
              <MoodSpark mood={s.moodByDay} />
            </div>
          )}
        </div>
      </div>

      {/* streaks */}
      {s.streaks.length > 0 && (
        <div className="section">
          <h2>Streaks alive</h2>
          <div className="card">
            {s.streaks.map(({ habit, streak }) => (
              <div className="row" key={habit.id}>
                <div className="txt">
                  <div className="t">{habit.name}</div>
                  <div className="m">{scheduleLabel(habit)}</div>
                </div>
                <span className="chip streak">
                  <IconFlame /> {streakLabel(streak)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function Review() {
  const { setSettingsOpen } = useUI();
  const tasks = useLiveQuery(() => db.tasks.toArray(), []);
  const habits = useLiveQuery(() => db.habits.toArray(), []);
  const habitLogs = useLiveQuery(() => db.habitLogs.toArray(), []);
  const checkins = useLiveQuery(() => db.checkins.toArray(), []);

  const loading =
    tasks === undefined ||
    habits === undefined ||
    habitLogs === undefined ||
    checkins === undefined;

  const summary = loading
    ? null
    : computeWeekSummary({ tasks, habits, habitLogs, checkins });

  return (
    <div className="screen">
      <header className="header">
        <div>
          <div className="kicker">Your last 7 days</div>
          <h1>Review</h1>
        </div>
        <div className="day-nav">
          <button className="icon-btn" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
            <IconSettings />
          </button>
        </div>
      </header>

      {summary && (
        <>
          {!summary.hasAnyData && summary.streaks.length === 0 ? (
            <>
              <div className={`rev-hero k-${summary.suggestion.kind}`}>
                <div className="rev-hero-label">One thing</div>
                <p>{summary.suggestion.text}</p>
              </div>
              <div className="placeholder">
                <div className="ph-icon"><IconChart size={26} /></div>
                <h2>Nothing to review yet</h2>
                <p>Complete a task, keep a habit, or check in — this week fills in as you go.</p>
              </div>
            </>
          ) : (
            <Content s={summary} />
          )}
        </>
      )}
    </div>
  );
}
