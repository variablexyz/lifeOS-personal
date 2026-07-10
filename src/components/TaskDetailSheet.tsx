import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  addTask,
  updateTask,
  toggleTask,
  deleteTaskDeep,
  type Priority,
  type Task,
} from "../db";
import { dayOfISO, timeLabel, toLocalISO, todayStr } from "../lib/dates";
import { useUI } from "../store";
import { IconBell, IconCheck, IconTrash } from "./icons";

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 0, label: "None" },
  { value: 1, label: "Low" },
  { value: 2, label: "Med" },
  { value: 3, label: "High" },
];

export default function TaskDetailSheet() {
  const { detailTaskId, openTask, openReminders } = useUI();
  const task = useLiveQuery(
    () => (detailTaskId ? db.tasks.get(detailTaskId) : undefined),
    [detailTaskId]
  );
  const subtasks = useLiveQuery(
    () =>
      detailTaskId
        ? db.tasks.where("parentId").equals(detailTaskId).toArray()
        : [],
    [detailTaskId]
  );
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? [];
  const [newSub, setNewSub] = useState("");
  const [newProject, setNewProject] = useState(false);
  const [projectName, setProjectName] = useState("");

  if (!detailTaskId || !task) return null;

  const close = () => openTask(null);

  const schedDay = task.scheduledAt ? dayOfISO(task.scheduledAt) : "";
  const schedTime = task.scheduledAt ? timeLabel(task.scheduledAt).padStart(5, "0") : "";

  async function setSchedule(day: string, time: string) {
    if (!day || !time) {
      await updateTask(task!.id, { scheduledAt: undefined });
      return;
    }
    await updateTask(task!.id, { scheduledAt: toLocalISO(day, time) });
  }

  async function addSubtask() {
    const title = newSub.trim();
    if (!title) return;
    await addTask({ title, parentId: task!.id });
    setNewSub("");
  }

  async function createProject() {
    const name = projectName.trim();
    if (!name) return;
    const id = await db.projects.add({ name, color: "#5c8a64", archived: false } as never);
    await updateTask(task!.id, { projectId: id as number });
    setProjectName("");
    setNewProject(false);
  }

  return (
    <>
      <div className="overlay" onClick={close} />
      <div className="sheet" role="dialog" aria-label="Task details">
        <div className="grab" />

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button
            className={`cb ${task.done ? "done" : ""}`}
            aria-label={task.done ? "Mark not done" : "Mark done"}
            onClick={() => toggleTask(task)}
          >
            <IconCheck />
          </button>
          <input
            type="text"
            value={task.title}
            onChange={(e) => updateTask(task.id, { title: e.target.value })}
            style={{
              flex: 1,
              fontSize: 17,
              fontWeight: 700,
              border: "none",
              background: "none",
              outline: "none",
              padding: 0,
            }}
          />
        </div>

        <div className="field">
          <label>Priority</label>
          <div className="seg" style={{ width: "100%" }}>
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                className={task.priority === p.value ? "on" : ""}
                style={{ flex: 1 }}
                onClick={() => updateTask(task.id, { priority: p.value })}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Due date</label>
            <input
              type="date"
              value={task.dueDate ?? ""}
              onChange={(e) =>
                updateTask(task.id, { dueDate: e.target.value || undefined })
              }
            />
          </div>
          <div className="field">
            <label>Project</label>
            {newProject ? (
              <input
                type="text"
                placeholder="Project name…"
                value={projectName}
                autoFocus
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createProject()}
                onBlur={createProject}
              />
            ) : (
              <select
                value={task.projectId ?? ""}
                onChange={(e) => {
                  if (e.target.value === "__new__") {
                    setNewProject(true);
                  } else {
                    updateTask(task.id, {
                      projectId: e.target.value ? Number(e.target.value) : undefined,
                    });
                  }
                }}
              >
                <option value="">None</option>
                {projects
                  .filter((p) => !p.archived || p.id === task.projectId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.archived ? " (archived)" : ""}
                    </option>
                  ))}
                <option value="__new__">+ New project…</option>
              </select>
            )}
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Scheduled</label>
            <input
              type="date"
              value={schedDay}
              onChange={(e) =>
                setSchedule(e.target.value, schedTime || "09:00")
              }
            />
          </div>
          <div className="field">
            <label>Time</label>
            <input
              type="time"
              value={schedTime}
              onChange={(e) =>
                setSchedule(schedDay || task.dueDate || todayStr(), e.target.value)
              }
            />
          </div>
          <div className="field field-sm">
            <label>Length</label>
            <input
              type="number"
              min={5}
              step={5}
              placeholder="min"
              value={task.durationMin ?? ""}
              onChange={(e) =>
                updateTask(task.id, {
                  durationMin: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
        </div>

        {task.scheduledAt && (
          <button
            className="btn ghost"
            style={{ marginBottom: 14, padding: "8px 14px", fontSize: 13 }}
            onClick={() => updateTask(task.id, { scheduledAt: undefined })}
          >
            Remove from timeline
          </button>
        )}

        <div className="field">
          <label>Reminders</label>
          <button
            className={`rem-btn ${task.reminders && task.reminders.length ? "has" : ""}`}
            onClick={() => openReminders({ kind: "task", id: task.id })}
          >
            <IconBell />
            {task.reminders && task.reminders.length
              ? `${task.reminders.length} reminder${task.reminders.length > 1 ? "s" : ""}`
              : "Add a reminder"}
          </button>
        </div>

        <div className="field">
          <label>Subtasks</label>
          {(subtasks ?? []).map((s: Task) => (
            <div className="sub-row" key={s.id}>
              <button
                className={`cb ${s.done ? "done" : ""}`}
                onClick={() => toggleTask(s)}
                aria-label="Toggle subtask"
              >
                <IconCheck size={10} />
              </button>
              <span className={s.done ? "done-t" : ""}>{s.title}</span>
              <button
                onClick={() => db.tasks.delete(s.id)}
                aria-label="Delete subtask"
                style={{ color: "var(--text-faint)" }}
              >
                <IconTrash size={14} />
              </button>
            </div>
          ))}
          <div className="subtask-add">
            <input
              type="text"
              placeholder="Add a subtask…"
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSubtask()}
            />
          </div>
        </div>

        <div className="field">
          <label>Notes</label>
          <textarea
            rows={2}
            value={task.notes ?? ""}
            placeholder="Anything else…"
            onChange={(e) => updateTask(task.id, { notes: e.target.value })}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <button
            className="btn danger-ghost"
            onClick={async () => {
              await deleteTaskDeep(task.id);
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
