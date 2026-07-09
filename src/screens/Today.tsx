import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, toggleTask, type Task, type EventItem, type Habit } from "../db";
import {
  addDays,
  dayLabel,
  dayOfISO,
  durLabel,
  fromDayStr,
  greeting,
  minutesOf,
  timeLabel,
  todayStr,
} from "../lib/dates";
import {
  computeStreak,
  isDueOn,
  logFor,
  mondayOf,
  streakLabel,
  toggleHabitLog,
} from "../lib/habits";
import { useUI } from "../store";
import Buddy from "../components/Buddy";
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconFlame,
  IconPlus,
} from "../components/icons";
import { PRIORITY_LABEL } from "../lib/quickadd";
import { companionMood, growthStage, useLevel } from "../lib/xp";
import { MoodFace, MOOD_WORDS } from "../components/mood";

const WD = ["S", "M", "T", "W", "T", "F", "S"];

type DItem =
  | { k: "task"; at: number | null; t: Task }
  | { k: "event"; at: number; e: EventItem }
  | { k: "habit"; at: number | null; h: Habit };

/** Which day a task belongs to: its scheduled day, else its due date. */
function taskDay(t: Task): string | null {
  if (t.scheduledAt) return dayOfISO(t.scheduledAt);
  return t.dueDate ?? null;
}

export default function Today() {
  const {
    selectedDay,
    setSelectedDay,
    openTask,
    openEvent,
    openHabitSheet,
    setCheckInOpen,
    setCompanionOpen,
    setQuickAddOpen,
  } = useUI();

  const today = todayStr();

  // re-render each minute so "today" stays correct across a rollover
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const events = useLiveQuery(() => db.events.toArray(), []) ?? [];
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? [];
  const habits =
    useLiveQuery(() => db.habits.filter((h) => !h.archived).toArray(), []) ?? [];
  const habitLogs = useLiveQuery(() => db.habitLogs.toArray(), []) ?? [];
  const nameRow = useLiveQuery(() => db.kv.get("userName"), []);
  const userName = ((nameRow?.value as string) ?? "").trim() || "there";
  const todayCheckin = useLiveQuery(
    () => db.checkins.where("date").equals(today).first(),
    [today]
  );
  const level = useLevel();

  const projectName = (id?: number) => projects.find((p) => p.id === id)?.name;
  const roots = tasks.filter((t) => t.parentId === 0);

  const weekMon = mondayOf(selectedDay);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekMon, i));
  const weekHasToday = today >= weekDays[0] && today <= weekDays[6];

  /* focus today whenever the visible week (or the tab) changes to one with today */
  useEffect(() => {
    if (!weekHasToday) return;
    const el = document.getElementById(`day-${today}`);
    if (el) setTimeout(() => el.scrollIntoView({ block: "start" }), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekMon]);

  const dayTasks = (day: string) => roots.filter((t) => taskDay(t) === day);
  const dayEvents = (day: string) => events.filter((e) => dayOfISO(e.start) === day);
  // daily / weekday habits are deterministic per day; timesPerWeek is flexible → Habits tab
  const dayHabits = (day: string) =>
    habits.filter((h) => h.schedule.kind !== "timesPerWeek" && isDueOn(h, day));

  const dayPct = (day: string) => {
    const ts = dayTasks(day);
    const total = ts.length;
    const done = ts.filter((t) => t.done).length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : null };
  };

  const dayItems = (day: string): DItem[] => {
    const items: DItem[] = [
      ...dayTasks(day).map(
        (t): DItem => ({ k: "task", at: t.scheduledAt ? minutesOf(t.scheduledAt) : null, t })
      ),
      ...dayEvents(day).map((e): DItem => ({ k: "event", at: minutesOf(e.start), e })),
      ...dayHabits(day).map((h): DItem => {
        if (!h.preferredTime) return { k: "habit", at: null, h };
        const [hh, mm] = h.preferredTime.split(":").map(Number);
        return { k: "habit", at: hh * 60 + mm, h };
      }),
    ];
    const kindOrder = { task: 0, event: 1, habit: 2 } as const;
    return items.sort((a, b) => {
      const aa = a.at ?? 100000;
      const bb = b.at ?? 100000;
      if (aa !== bb) return aa - bb;
      return kindOrder[a.k] - kindOrder[b.k];
    });
  };

  const overdue = weekHasToday
    ? roots.filter((t) => !t.done && taskDay(t) !== null && (taskDay(t) as string) < today)
    : [];
  const anytime = weekHasToday
    ? roots.filter((t) => !t.done && !t.scheduledAt && !t.dueDate)
    : [];

  function addToDay(day: string) {
    setSelectedDay(day);
    setQuickAddOpen(true);
  }

  /* companion mood — always reflects today */
  const dueToday = habits.filter((h) => isDueOn(h, today));
  const doneHabitsToday = dueToday.filter((h) => logFor(habitLogs, h.id, today)).length;
  const completedToday = roots.filter(
    (t) => t.done && t.completedAt && dayOfISO(t.completedAt) === today
  ).length;
  const mood = companionMood({
    checkedIn: !!todayCheckin,
    dueHabits: dueToday.length,
    doneHabits: doneHabitsToday,
    tasksCompletedToday: completedToday,
  });

  const checkinHour = new Date().getHours();
  const checkinPrompt =
    checkinHour < 12 ? "How's your morning going?" : checkinHour < 18 ? "How's your afternoon going?" : "How was your day?";

  const weekRange = `${dayLabel(weekDays[0]).split(", ")[1]} – ${dayLabel(weekDays[6]).split(", ")[1]}`;

  /* ---------- row renderers ---------- */
  const TaskRow = (t: Task, day: string) => {
    const meta = [
      t.scheduledAt ? timeLabel(t.scheduledAt) : null,
      durLabel(t.durationMin),
      projectName(t.projectId),
    ]
      .filter(Boolean)
      .join(" · ");
    return (
      <div className="row" key={`t${t.id}`} onClick={() => openTask(t.id)}>
        <button
          className={`cb ${t.done ? "done" : ""}`}
          aria-label={t.done ? "Mark not done" : "Mark done"}
          onClick={(e) => {
            e.stopPropagation();
            toggleTask(t);
          }}
        >
          <IconCheck />
        </button>
        <div className="txt">
          <div className={`t ${t.done ? "done-t" : ""}`}>{t.title}</div>
          {meta && <div className="m">{meta}</div>}
        </div>
        {t.priority > 0 && !t.done && <span className="chip pri">{PRIORITY_LABEL[t.priority]}</span>}
      </div>
    );
  };

  const EventRow = (e: EventItem) => {
    const mins = Math.round((new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000);
    return (
      <div className="row" key={`e${e.id}`} onClick={() => openEvent(e.id)}>
        <span className="ev-dot" aria-hidden="true">
          <i />
        </span>
        <div className="txt">
          <div className="t">{e.title}</div>
          <div className="m">{[timeLabel(e.start), durLabel(mins)].filter(Boolean).join(" · ")}</div>
        </div>
      </div>
    );
  };

  const HabitRow = (h: Habit, day: string) => {
    const logged = logFor(habitLogs, h.id, day);
    const streak = computeStreak(h, habitLogs);
    return (
      <div className="row" key={`h${h.id}`} onClick={() => openHabitSheet(h.id)}>
        <button
          className={`cb ${logged?.status === "done" ? "done" : ""}`}
          aria-label={logged ? "Undo habit" : "Log habit"}
          onClick={(e) => {
            e.stopPropagation();
            toggleHabitLog(h.id, day);
          }}
        >
          <IconCheck />
        </button>
        <div className="txt">
          <div className={`t ${logged ? "done-t" : ""}`}>
            {h.icon ? `${h.icon} ` : ""}
            {h.name}
          </div>
          <div className="m">{[h.preferredTime, "Habit"].filter(Boolean).join(" · ")}</div>
        </div>
        {streak.value > 0 && (
          <span className="chip streak">
            <IconFlame /> {streakLabel(streak)}
          </span>
        )}
      </div>
    );
  };

  const renderItem = (it: DItem, day: string) =>
    it.k === "task" ? TaskRow(it.t, day) : it.k === "event" ? EventRow(it.e) : HabitRow(it.h, day);

  return (
    <div className="screen">
      <header className="header">
        <button
          onClick={() => setCompanionOpen(true)}
          aria-label="Open companion"
          style={{ position: "relative" }}
        >
          <Buddy mood={mood} stage={growthStage(level.level)} />
          <span className="lvl-badge">{level.level}</span>
        </button>
        <div>
          <div className="kicker">{weekRange}</div>
          <h1>{weekHasToday ? greeting(userName) : "Your week"}</h1>
        </div>
        <div className="day-nav">
          <button aria-label="Previous week" onClick={() => setSelectedDay(addDays(selectedDay, -7))}>
            <IconChevronLeft />
          </button>
          {!weekHasToday && (
            <button className="today-btn" onClick={() => setSelectedDay(today)}>
              This week
            </button>
          )}
          <button aria-label="Next week" onClick={() => setSelectedDay(addDays(selectedDay, 7))}>
            <IconChevronRight />
          </button>
        </div>
      </header>

      {weekHasToday && (
        <button className="checkin" onClick={() => setCheckInOpen(true)}>
          {todayCheckin ? (
            <>
              <span className="checkin-mood">
                <MoodFace v={todayCheckin.mood as 1 | 2 | 3 | 4 | 5} size={28} />
              </span>
              <p>Feeling {MOOD_WORDS[todayCheckin.mood].toLowerCase()} — tap to update</p>
            </>
          ) : (
            <>
              <p>{checkinPrompt}</p>
              <span className="checkin-cta">Check in · 30 sec</span>
            </>
          )}
        </button>
      )}

      {/* week strip */}
      <div className="wk-strip" aria-label="Week overview">
        {weekDays.map((day) => {
          const d = fromDayStr(day);
          const { pct } = dayPct(day);
          const isT = day === today;
          const isSel = day === selectedDay;
          return (
            <button
              key={day}
              className={`wk-cell ${isT ? "today" : ""} ${isSel ? "sel" : ""}`}
              aria-label={dayLabel(day)}
              onClick={() => {
                setSelectedDay(day);
                const el = document.getElementById(`day-${day}`);
                if (el) setTimeout(() => el.scrollIntoView({ block: "start" }), 0);
              }}
            >
              <span className="wk-dow">{WD[d.getDay()]}</span>
              <span className="wk-date">{d.getDate()}</span>
              <span className="wk-mini">
                <i style={{ width: `${pct ?? 0}%` }} />
              </span>
            </button>
          );
        })}
      </div>

      {overdue.length > 0 && (
        <div className="card day-card overdue-card">
          <div className="day-head">
            <span className="dl">Overdue</span>
            <span className="day-pct">{overdue.length}</span>
          </div>
          {overdue.map((t) => TaskRow(t, today))}
        </div>
      )}

      {/* one card per day */}
      {weekDays.map((day) => {
        const { done, total, pct } = dayPct(day);
        const items = dayItems(day);
        const parts = dayLabel(day).split(", ");
        const isT = day === today;
        return (
          <div className={`card day-card ${isT ? "is-today" : ""}`} id={`day-${day}`} key={day}>
            <div className="day-head" onClick={() => setSelectedDay(day)}>
              <span className="dl">{parts[0]}</span>
              <span className="dd">{parts[1]}</span>
              {isT && <span className="day-tag">Today</span>}
              {pct !== null && (
                <span className="day-pct">
                  {pct}% · {done}/{total}
                </span>
              )}
              <button
                className="day-add"
                aria-label={`Add to ${parts[0]}`}
                onClick={(e) => {
                  e.stopPropagation();
                  addToDay(day);
                }}
              >
                <IconPlus size={16} />
              </button>
            </div>
            {pct !== null && (
              <div className="prog">
                <i style={{ width: `${pct}%` }} />
              </div>
            )}
            {items.length === 0 ? (
              <div className="day-empty">Nothing planned</div>
            ) : (
              items.map((it) => renderItem(it, day))
            )}
          </div>
        );
      })}

      {anytime.length > 0 && (
        <div className="card day-card">
          <div className="day-head">
            <span className="dl">Anytime</span>
            <span className="dd">no date</span>
            <span className="day-pct">{anytime.length}</span>
          </div>
          {anytime.map((t) => TaskRow(t, today))}
        </div>
      )}
    </div>
  );
}
