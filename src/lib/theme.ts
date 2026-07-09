import { db } from "../db";

/* Theme override. "system" follows prefers-color-scheme (default); "light"
   / "dark" force a mode via a data-theme attribute on <html>. A localStorage
   mirror lets index.html apply the choice before first paint (no flash). */

export type ThemePref = "system" | "light" | "dark";

const LS_KEY = "lifeos-theme";

export function applyTheme(pref: ThemePref): void {
  const root = document.documentElement;
  if (pref === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", pref);
  try {
    if (pref === "system") localStorage.removeItem(LS_KEY);
    else localStorage.setItem(LS_KEY, pref);
  } catch {
    /* private mode / storage disabled — attribute still applied */
  }
}

export async function loadThemePref(): Promise<ThemePref> {
  const row = await db.kv.get("themePref");
  const v = row?.value as ThemePref | undefined;
  return v === "light" || v === "dark" ? v : "system";
}

export async function saveThemePref(pref: ThemePref): Promise<void> {
  await db.kv.put({ key: "themePref", value: pref });
  applyTheme(pref);
}
