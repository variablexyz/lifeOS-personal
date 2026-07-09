import { db } from "../db";

/* ================================================================
   Backup — a single portable JSON snapshot of everything. Because all
   data is local (IndexedDB), export/import is the only safety net
   against a cleared browser or a lost device.
   ================================================================ */

export const BACKUP_VERSION = 1;

const TABLES = [
  "tasks",
  "projects",
  "events",
  "habits",
  "habitLogs",
  "checkins",
  "focusSessions",
  "xpEvents",
  "kv",
] as const;

type TableName = (typeof TABLES)[number];

export interface BackupFile {
  app: "lifeos";
  version: number;
  exportedAt: string;
  data: Record<TableName, unknown[]>;
}

export interface BackupStats {
  tables: number;
  records: number;
}

export async function buildBackup(): Promise<BackupFile> {
  const data = {} as Record<TableName, unknown[]>;
  await db.transaction("r", db.tables, async () => {
    for (const name of TABLES) {
      data[name] = await (db as unknown as Record<string, { toArray(): Promise<unknown[]> }>)[
        name
      ].toArray();
    }
  });
  return {
    app: "lifeos",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function backupFilename(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `lifeos-backup-${y}-${m}-${day}.json`;
}

/** Trigger a download of the current data as a JSON file. */
export async function exportBackup(): Promise<BackupStats> {
  const backup = await buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = backupFilename();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return backupStats(backup);
}

/** Validate a parsed object as a LifeOS backup; throws with a friendly
    message on a bad shape. */
export function validateBackup(obj: unknown): BackupFile {
  if (!obj || typeof obj !== "object") throw new Error("This isn't a valid backup file.");
  const b = obj as Partial<BackupFile>;
  if (b.app !== "lifeos") throw new Error("This file isn't a LifeOS backup.");
  if (typeof b.version !== "number" || b.version > BACKUP_VERSION)
    throw new Error("This backup was made by a newer version of LifeOS.");
  if (!b.data || typeof b.data !== "object") throw new Error("The backup is missing its data.");
  for (const name of TABLES) {
    const rows = (b.data as Record<string, unknown>)[name];
    if (rows !== undefined && !Array.isArray(rows))
      throw new Error(`The backup's "${name}" data is malformed.`);
  }
  return b as BackupFile;
}

export function backupStats(b: BackupFile): BackupStats {
  let records = 0;
  let tables = 0;
  for (const name of TABLES) {
    const rows = b.data[name];
    if (Array.isArray(rows)) {
      tables++;
      records += rows.length;
    }
  }
  return { tables, records };
}

/** Replace ALL local data with the contents of a validated backup. */
export async function importBackup(b: BackupFile): Promise<BackupStats> {
  validateBackup(b);
  await db.transaction("rw", db.tables, async () => {
    for (const name of TABLES) {
      const table = (db as unknown as Record<
        string,
        { clear(): Promise<void>; bulkPut(rows: unknown[]): Promise<unknown> }
      >)[name];
      await table.clear();
      const rows = b.data[name];
      if (Array.isArray(rows) && rows.length) await table.bulkPut(rows);
    }
  });
  return backupStats(b);
}

/** Parse + validate + import from a File chosen in a picker. */
export async function importBackupFromFile(file: File): Promise<BackupStats> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  return importBackup(validateBackup(parsed));
}
