import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, toggleTask, type Project, type Task } from "../db";
import { dayLabel, todayStr } from "../lib/dates";
import { useUI } from "../store";
import { IconCheck, IconFolder, IconPlus } from "../components/icons";
import { PRIORITY_LABEL } from "../lib/quickadd";

function ProjectCard({ project, tasks }: { project: Project; tasks: Task[] }) {
  const { openProjectSheet, openTask } = useUI();
  const roots = tasks
    .filter((t) => t.parentId === 0)
    .sort((a, b) =>
      a.done !== b.done
        ? a.done ? 1 : -1
        : b.priority - a.priority || a.createdAt.localeCompare(b.createdAt)
    );
  const done = roots.filter((t) => t.done).length;
  const total = roots.length;
  const pct = total ? Math.round((done / total) * 100) : null;
  const today = todayStr();

  return (
    <div className="card day-card proj-card">
      <div className="day-head" onClick={() => openProjectSheet(project.id)}>
        <span className="proj-dot" style={{ background: project.color }} aria-hidden="true" />
        <span className="dl">{project.name}</span>
        {pct !== null && (
          <span className="day-pct">
            {pct}% · {done}/{total}
          </span>
        )}
      </div>
      {pct !== null && (
        <div className="prog">
          <i style={{ width: `${pct}%`, background: project.color }} />
        </div>
      )}
      {roots.length === 0 ? (
        <div className="day-empty">No tasks yet</div>
      ) : (
        roots.map((t) => (
          <div className="row" key={t.id} onClick={() => openTask(t.id)}>
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
              {t.dueDate && (
                <div className="m">
                  {!t.done && t.dueDate < today ? "Overdue · " : ""}
                  {dayLabel(t.dueDate).split(",")[0]}
                </div>
              )}
            </div>
            {t.priority > 0 && !t.done && <span className="chip pri">{PRIORITY_LABEL[t.priority]}</span>}
          </div>
        ))
      )}
    </div>
  );
}

export default function Projects() {
  const { openProjectSheet } = useUI();
  const [showArchived, setShowArchived] = useState(false);

  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];

  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);
  const tasksFor = (id: number) => tasks.filter((t) => t.projectId === id);

  return (
    <div className="screen">
      <header className="header">
        <div>
          <div className="kicker">Group your work</div>
          <h1>Projects</h1>
        </div>
        <div className="day-nav">
          <button
            className="today-btn"
            onClick={() => openProjectSheet("new")}
            aria-label="New project"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <IconPlus size={14} /> New
          </button>
        </div>
      </header>

      {active.length === 0 ? (
        <div className="placeholder">
          <div className="ph-icon">
            <IconFolder size={26} />
          </div>
          <h2>No projects yet</h2>
          <p>Group related tasks together — a launch, a trip, a house move.</p>
        </div>
      ) : (
        active.map((p) => <ProjectCard key={p.id} project={p} tasks={tasksFor(p.id)} />)
      )}

      {archived.length > 0 && (
        <div className="archived-toggle-wrap">
          <button className="link-btn" onClick={() => setShowArchived((s) => !s)}>
            {showArchived ? "Hide" : "Show"} archived ({archived.length})
          </button>
        </div>
      )}

      {showArchived && archived.map((p) => <ProjectCard key={p.id} project={p} tasks={tasksFor(p.id)} />)}
    </div>
  );
}
