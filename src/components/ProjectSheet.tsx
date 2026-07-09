import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { useUI } from "../store";
import { IconTrash } from "./icons";

const PALETTE = [
  "#5c8a64", // sage (accent)
  "#de9445", // clay
  "#8a6bb0", // plum
  "#5c7cba", // indigo
  "#c46b7a", // rose
  "#4a9b8f", // teal
  "#c9a227", // gold
  "#6b7685", // slate
];

/** Create (projectSheet === "new") or edit (projectSheet === id) a project. */
export default function ProjectSheet() {
  const { projectSheet, openProjectSheet, showToast } = useUI();
  const editing = useLiveQuery(
    () => (typeof projectSheet === "number" ? db.projects.get(projectSheet) : undefined),
    [projectSheet]
  );

  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);

  useEffect(() => {
    if (projectSheet === "new") {
      setName("");
      setColor(PALETTE[0]);
    } else if (editing) {
      setName(editing.name);
      setColor(editing.color || PALETTE[0]);
    }
  }, [projectSheet, editing]);

  if (projectSheet === null) return null;
  const close = () => openProjectSheet(null);
  const valid = name.trim().length > 0;

  async function save() {
    if (!valid) return;
    const data = { name: name.trim(), color };
    if (typeof projectSheet === "number") {
      await db.projects.update(projectSheet, data);
    } else {
      await db.projects.add({ ...data, archived: false } as never);
    }
    close();
  }

  return (
    <>
      <div className="overlay" onClick={close} />
      <div className="sheet" role="dialog" aria-label="Project">
        <div className="grab" />
        <h3>{typeof projectSheet === "number" ? "Edit project" : "New project"}</h3>

        <div className="field">
          <label>Name</label>
          <input
            type="text"
            placeholder="Investor deck, House move, LifeOS…"
            value={name}
            autoFocus={projectSheet === "new"}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Color</label>
          <div className="swatch-row">
            {PALETTE.map((c) => (
              <button
                key={c}
                className={`swatch ${color === c ? "on" : ""}`}
                style={{ background: c }}
                aria-label={`Choose ${c}`}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          {typeof projectSheet === "number" && editing ? (
            editing.archived ? (
              <button
                className="btn ghost"
                onClick={async () => {
                  await db.projects.update(projectSheet, { archived: false });
                  showToast("Project restored");
                  close();
                }}
              >
                Unarchive
              </button>
            ) : (
              <button
                className="btn danger-ghost"
                onClick={async () => {
                  await db.projects.update(projectSheet, { archived: true });
                  close();
                }}
              >
                <IconTrash size={15} /> Archive
              </button>
            )
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
