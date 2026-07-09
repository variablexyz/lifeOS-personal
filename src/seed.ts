import { db, nowISO, setFlag } from "./db";
import { addDays, todayStr, toLocalISO } from "./lib/dates";

/** One-tap sample day/week so the app demos well immediately. */
export async function seedSampleData() {
  const today = todayStr();
  const t = (time: string) => toLocalISO(today, time);
  const now = nowISO();

  const projectId = await db.projects.add({
    name: "LifeOS",
    color: "#5c8a64",
    archived: false,
  } as never);

  const onePagerId = await db.tasks.add({
    title: "Finish investor one-pager",
    projectId,
    priority: 3,
    dueDate: today,
    scheduledAt: t("11:00"),
    durationMin: 90,
    parentId: 0,
    done: false,
    createdAt: now,
    updatedAt: now,
  } as never);

  await db.tasks.bulkAdd([
    {
      title: "Draft problem statement",
      parentId: onePagerId,
      priority: 0,
      done: true,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      title: "Add traction numbers",
      parentId: onePagerId,
      priority: 0,
      done: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      title: "Morning stretch",
      parentId: 0,
      priority: 0,
      dueDate: today,
      done: true,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      title: "Book dentist appointment",
      parentId: 0,
      priority: 0,
      dueDate: today,
      done: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      title: "Review design mockups",
      parentId: 0,
      priority: 2,
      dueDate: addDays(today, 1),
      done: false,
      createdAt: now,
      updatedAt: now,
    },
  ] as never[]);

  await db.events.bulkAdd([
    {
      title: "Team standup",
      start: t("09:00"),
      end: t("09:30"),
      allDay: false,
    },
    {
      title: "Product sync",
      start: t("14:00"),
      end: t("14:45"),
      allDay: false,
    },
    {
      title: "Coffee with Maya",
      start: toLocalISO(addDays(today, 1), "10:00"),
      end: toLocalISO(addDays(today, 1), "11:00"),
      allDay: false,
    },
  ] as never[]);

  // Habits get real UI in Phase 2 — seeded now so that phase demos too.
  const runId = await db.habits.add({
    name: "Morning run",
    type: "build",
    schedule: { kind: "timesPerWeek", n: 3 },
    preferredTime: "19:00",
    archived: false,
    createdAt: now,
  } as never);
  const readId = await db.habits.add({
    name: "Read 20 min",
    type: "build",
    schedule: { kind: "daily" },
    archived: false,
    createdAt: now,
  } as never);
  const logs: { habitId: number; date: string; status: "done" }[] = [];
  for (let i = 1; i <= 12; i++) {
    if (i % 2 === 0) logs.push({ habitId: runId as number, date: addDays(today, -i), status: "done" });
    if (i <= 8) logs.push({ habitId: readId as number, date: addDays(today, -i), status: "done" });
  }
  await db.habitLogs.bulkAdd(logs as never[]);

  await setFlag("seeded", true);
}
