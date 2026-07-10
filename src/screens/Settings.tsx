import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, setFlag, wipeAll } from "../db";
import { useUI } from "../store";
import { exportBackup, importBackupFromFile } from "../lib/backup";
import {
  DEFAULT_NOTIF_PREFS,
  loadNotifPrefs,
  notifPermission,
  notifSupported,
  requestNotifPermission,
  saveNotifPrefs,
  type NotifPrefs,
} from "../lib/notify";
import { loadThemePref, saveThemePref, type ThemePref } from "../lib/theme";
import { authAvailable, signIn, signOutUser, useAuthUser } from "../lib/auth";

const THEMES: { id: ThemePref; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

const LEAD_OPTS: { v: number; label: string }[] = [
  { v: -1, label: "None" },
  { v: 0, label: "At the time" },
  { v: 5, label: "5 min before" },
  { v: 10, label: "10 min before" },
  { v: 15, label: "15 min before" },
  { v: 30, label: "30 min before" },
  { v: 60, label: "1 hour before" },
];

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      className={`toggle ${on ? "on" : ""}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
    >
      <span className="knob" />
    </button>
  );
}

export default function Settings() {
  const { settingsOpen, setSettingsOpen, showToast } = useUI();
  const { user, ready: authReady } = useAuthUser();
  const nameRow = useLiveQuery(() => db.kv.get("userName"), []);
  const [name, setName] = useState("");
  const [theme, setTheme] = useState<ThemePref>("system");
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    setName((nameRow?.value as string) ?? "");
    loadThemePref().then(setTheme);
    loadNotifPrefs().then(setPrefs);
    setPerm(notifPermission());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsOpen]);

  if (!settingsOpen) return null;
  const close = () => setSettingsOpen(false);

  async function persist(next: NotifPrefs) {
    setPrefs(next);
    await saveNotifPrefs(next);
  }
  const patch = (p: Partial<NotifPrefs>) => persist({ ...prefs, ...p });

  async function saveName(v: string) {
    await setFlag("userName", v.trim());
  }
  async function chooseTheme(t: ThemePref) {
    setTheme(t);
    await saveThemePref(t);
  }
  async function toggleEnabled() {
    if (!prefs.enabled) {
      if (notifSupported() && notifPermission() !== "granted") {
        const p = await requestNotifPermission();
        setPerm(p);
        if (p !== "granted") {
          showToast("Notifications are blocked in your browser");
          return;
        }
      }
    }
    await patch({ enabled: !prefs.enabled });
  }
  async function doExport() {
    try {
      const s = await exportBackup();
      showToast(`Exported ${s.records} items`);
    } catch {
      showToast("Couldn't export right now");
    }
  }
  async function onImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!confirm("Importing replaces all current data with this backup. Continue?")) return;
    try {
      const s = await importBackupFromFile(file);
      showToast(`Imported ${s.records} items`);
      setTimeout(() => location.reload(), 700);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Import failed");
    }
  }
  async function doReset() {
    if (!confirm("Erase all LifeOS data on this device? This can't be undone.")) return;
    await wipeAll();
    location.reload();
  }

  async function handleSignIn() {
    try {
      await signIn();
      showToast("Signed in");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Sign-in failed");
    }
  }
  async function handleSignOut() {
    await signOutUser();
    showToast("Signed out");
  }

  const permBlocked = notifSupported() && perm === "denied";

  return (
    <>
      <div className="overlay" onClick={close} />
      <div className="sheet" role="dialog" aria-label="Settings">
        <div className="grab" />
        <h3>Settings</h3>

        <div className="field">
          <label>Account</label>
          {!authAvailable() ? (
            <p className="qa-hint" style={{ marginTop: 0 }}>
              Google sign-in needs the hosted version of LifeOS, not the local file. Open your
              deployed URL to sign in.
            </p>
          ) : !authReady ? (
            <p className="qa-hint" style={{ marginTop: 0 }}>
              Checking sign-in status…
            </p>
          ) : user ? (
            <div className="set-row">
              <div className="set-txt">
                <div className="st">{user.displayName ?? user.email}</div>
                <div className="sm">Signed in with Google · your data stays on this device for now</div>
              </div>
              <button className="btn ghost" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          ) : (
            <button className="btn ghost" style={{ width: "100%" }} onClick={handleSignIn}>
              Sign in with Google
            </button>
          )}
        </div>

        <div className="field">
          <label>Your name</label>
          <input
            type="text"
            value={name}
            placeholder="What should we call you?"
            onChange={(e) => setName(e.target.value)}
            onBlur={(e) => saveName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveName((e.target as HTMLInputElement).value)}
          />
        </div>

        <div className="field">
          <label>Theme</label>
          <div className="seg">
            {THEMES.map((t) => (
              <button key={t.id} className={theme === t.id ? "on" : ""} onClick={() => chooseTheme(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Reminders</label>
          <div className="set-row">
            <div className="set-txt">
              <div className="st">Notifications</div>
              <div className="sm">
                {!notifSupported()
                  ? "Not supported on this device"
                  : permBlocked
                  ? "Blocked in browser settings"
                  : "Nudges for your tasks, events, and habits"}
              </div>
            </div>
            <Toggle on={prefs.enabled} onClick={toggleEnabled} label="Enable notifications" />
          </div>

          {prefs.enabled && (
            <>
              <div className="set-row sub">
                <div className="set-txt"><div className="st">Task times</div></div>
                <Toggle on={prefs.tasks} onClick={() => patch({ tasks: !prefs.tasks })} label="Task reminders" />
              </div>
              <div className="set-row sub">
                <div className="set-txt"><div className="st">Event times</div></div>
                <Toggle on={prefs.events} onClick={() => patch({ events: !prefs.events })} label="Event reminders" />
              </div>
              <div className="set-row sub">
                <div className="set-txt"><div className="st">Habit times</div></div>
                <Toggle on={prefs.habits} onClick={() => patch({ habits: !prefs.habits })} label="Habit reminders" />
              </div>

              <div className="set-row stack">
                <div className="set-txt">
                  <div className="st">Default reminder</div>
                  <div className="sm">Applied to timed items you haven't customized</div>
                </div>
                <select
                  className="set-select"
                  value={prefs.defaultLeadMin}
                  onChange={(e) => patch({ defaultLeadMin: Number(e.target.value) })}
                >
                  {LEAD_OPTS.map((o) => (
                    <option key={o.v} value={o.v}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="set-row">
                <div className="set-txt">
                  <div className="st">Quiet hours</div>
                  <div className="sm">Hold reminders overnight, deliver when it ends</div>
                </div>
                <Toggle
                  on={prefs.quietHours.enabled}
                  onClick={() => patch({ quietHours: { ...prefs.quietHours, enabled: !prefs.quietHours.enabled } })}
                  label="Quiet hours"
                />
              </div>
              {prefs.quietHours.enabled && (
                <div className="set-row sub time-pair">
                  <label className="time-lab">From
                    <input type="time" value={prefs.quietHours.start}
                      onChange={(e) => patch({ quietHours: { ...prefs.quietHours, start: e.target.value } })} />
                  </label>
                  <label className="time-lab">To
                    <input type="time" value={prefs.quietHours.end}
                      onChange={(e) => patch({ quietHours: { ...prefs.quietHours, end: e.target.value } })} />
                  </label>
                </div>
              )}

              <div className="set-row">
                <div className="set-txt">
                  <div className="st">Morning agenda</div>
                  <div className="sm">A daily summary of what's ahead</div>
                </div>
                <Toggle
                  on={prefs.agenda.enabled}
                  onClick={() => patch({ agenda: { ...prefs.agenda, enabled: !prefs.agenda.enabled } })}
                  label="Morning agenda"
                />
              </div>
              {prefs.agenda.enabled && (
                <div className="set-row sub time-pair">
                  <label className="time-lab">At
                    <input type="time" value={prefs.agenda.time}
                      onChange={(e) => patch({ agenda: { ...prefs.agenda, time: e.target.value } })} />
                  </label>
                </div>
              )}

              <div className="set-row">
                <div className="set-txt">
                  <div className="st">Evening check-in</div>
                  <div className="sm">A nudge to reflect — only if you haven't</div>
                </div>
                <Toggle
                  on={prefs.checkin.enabled}
                  onClick={() => patch({ checkin: { ...prefs.checkin, enabled: !prefs.checkin.enabled } })}
                  label="Evening check-in"
                />
              </div>
              {prefs.checkin.enabled && (
                <div className="set-row sub time-pair">
                  <label className="time-lab">At
                    <input type="time" value={prefs.checkin.time}
                      onChange={(e) => patch({ checkin: { ...prefs.checkin, time: e.target.value } })} />
                  </label>
                </div>
              )}

              <p className="set-note">
                Reminders fire while LifeOS is open. Some browsers also deliver them when it's closed.
              </p>
            </>
          )}
        </div>

        <div className="field">
          <label>Your data</label>
          <div className="set-actions">
            <button className="btn ghost" onClick={doExport}>Export backup</button>
            <button className="btn ghost" onClick={() => fileRef.current?.click()}>Import backup</button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={onImportFile}
          />
          <button className="btn danger-ghost" style={{ width: "100%", marginTop: 8 }} onClick={doReset}>
            Erase all data
          </button>
        </div>

        <button className="btn primary" style={{ width: "100%" }} onClick={close}>Done</button>
      </div>
    </>
  );
}
