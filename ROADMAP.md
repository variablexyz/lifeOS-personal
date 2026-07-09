# LifeOS — Roadmap

One calm place for tasks, habits, focus, and daily reflection. Local-first
(all data in IndexedDB via Dexie), single-file build, installable PWA.

---

## Shipped

**Foundation — Today**
Task model with subtasks, priorities, due dates, and scheduling. A day
timeline mixing tasks and events, quick-add with natural-language parsing
(chrono-node), and a first-run choice of sample data or a blank start.

**Phase 2 — Habits**
Habit engine with daily / times-per-week / weekday schedules. Streaks are
always derived from logs (never stored), with a gentle one-miss-per-week
forgiveness rule and no red "failure" states. 12-week heatmap per habit.

**Focus**
Persistent focus timer with presets, pause/resume that survives reload, and
a recent-sessions list. Sessions award XP.

**Check-ins & Companion**
30-second mood + energy check-in with drawn faces (never emoji). A sprout
companion whose mood reflects the day's consistency, plus an XP/level system
with a full audit trail (undo writes compensating events, never deletes).

**Phase 5 — Review & PWA**
A rolling 7-day Review: completions (tasks, habits, focus, check-ins),
per-day activity bars, mood & energy trend with a sparkline, active streaks,
and one gentle, data-driven suggestion. Installable, offline-first PWA with a
manifest, cache-first service worker, and app icons.

---

## Phase 6 — Reliability *(complete)*

Turns LifeOS from a great demo into something safe to rely on daily.

### 6a · Backup — export & import
Export a single versioned JSON snapshot of every table; download as
`lifeos-backup-YYYY-MM-DD.json`; import with validation and a clear "this
replaces current data" confirm, applied in one Dexie transaction. *Data lives
only in IndexedDB today, so clearing the browser means unrecoverable loss.*

### 6b · Reminders & notifications
Notification-permission flow and per-category prefs (tasks / habits) in `kv`.
A scheduler fires reminders for today's scheduled tasks and habit preferred
times — reliably while the app is open, and via the Notification Triggers API
for closed-app delivery where supported. *The data already carries the times;
nothing used them.*

### 6c · Settings
A Settings sheet: display name (replaces the hard-coded greeting), theme
override (System / Light / Dark, attribute-based and flash-free), notification
toggles, and data management (export, import, reset). *There was no settings
surface at all.*

---

## Phase 7 — Custom reminders *(complete)*

Per-item control and calmer defaults on top of Phase 6's notifications.

### Per-item reminders
A bell on every task and event opens a "Remind me" picker — multi-select
offsets (at the time, 5 / 10 / 30 min, 1 / 2 hours, 1 day before, or a custom
minutes-before), shown as removable chips. Stored as `reminders: number[]` on
the item. Events are wired into notifications for the first time.

### Customizable controls & nudges (all optional, all in Settings)
- **Default lead-time** — new timed items auto-get one reminder (e.g. 10 min
  before) until you customize them.
- **Quiet hours** — a Do-Not-Disturb window; reminders due inside it are held
  and delivered when it ends.
- **Morning agenda** — a daily summary at a time you choose (tasks, events,
  and habits due today).
- **Evening check-in nudge** — a reflection prompt at your chosen time, only
  if you haven't already checked in.
- Per-category toggles now cover tasks, **events**, and habits.

---

## Phase 8 — Week planner *(complete)*

The Today tab is now a week planner. A week strip (7 days with dates and a
per-day completion bar) sits above one card per day, each showing that day's
tasks, events, and scheduled habits under it. Today is emphasized and
auto-scrolled into view; the header navigates by week.

- **Per-day completion %** — completed tasks ÷ total tasks for that day, live:
  adding a task lowers it, checking one off raises it. Empty days show no bar.
- **Add to a specific day** — each day card has a + that opens quick-add
  pre-targeted to that day.
- **Overdue** and **Anytime** buckets surface dated-but-past and undated tasks
  when viewing the current week, so nothing is lost.
- Recurring `timesPerWeek` habits stay on the Habits tab (they're flexible);
  daily and weekday habits appear on their days.

*Follow-up:* the week runs Monday–Sunday; a configurable week-start (backlog
item below) would let users choose Sunday.

---

## Phase 9 — Projects tab, Focus removed *(complete)*

The Focus timer tab is gone; **Projects** takes its slot in the bottom nav.

### Projects
Each project renders as a card: name, a color dot, an all-time completion bar
(done ÷ total root tasks in that project, live as tasks are added/completed),
and its tasks listed underneath — tap to open, checkbox to toggle. A `+ New`
button and a `ProjectSheet` (mirrors the Habit sheet's create/edit pattern)
handle naming, an 8-color palette, and archive/unarchive. Archived projects
are hidden by default behind a "Show archived" toggle. The task detail
sheet's project picker now excludes archived projects (except the one
currently assigned, so it never silently vanishes from a task already using
it).

### Focus — removed
The timer, its presets, pause/resume, and session history are gone, along
with its XP source and the Review screen's focus stat + "try a focus
session" suggestion. The `focusSessions` table stays in the schema (unused)
so no destructive migration was needed for any existing local data.

---

## Phase 10 — Habits UX rebuild *(complete)*

The Habits screen went from a flat, static list to a screen that tells you
what actually needs attention today, and fixed two real bugs along the way.

### Two bugs fixed
- **Heatmap false negatives** — a `timesPerWeek` habit (e.g. "3× a week")
  used to paint ~4 of every 7 days as "missed" in its 12-week heatmap, even
  in a perfect week, because `isDueOn()` always returns true for that
  schedule kind. Unlogged past days for these habits now render as neutral
  "not due" instead — daily/weekday habits keep their real missed signal.
- **Unreachable "skipped" status** — the data model always had a `skipped`
  log status (forgiven, doesn't break a streak) but nothing in the UI could
  ever set it. A "Skip today" link now appears on habits that need logging.
  Fixed a latent XP bug this exposed: undoing a skip no longer deducts XP
  that a skip never earned in the first place.

### New in the UI
- **Today progress summary** — "3 of 5 done today" with a progress bar, at
  the top of the screen.
- **Smart sort** — habits that need attention today float to the top,
  logged ones settle in the middle, and habits not due today (or a
  `timesPerWeek` habit that already hit its target) sink down and dim.
- **Filter segments** — All / Today / Build / Avoid.
- **Tap any heatmap cell** to log or undo that past day directly, instead of
  the grid being purely decorative.
- **Build vs. Avoid habits** now read differently — a tinted checkbox and
  language that says "Mark avoided" instead of "Log" for break habits.
- **Per-habit icon** — an optional emoji picker in the habit sheet, shown
  next to the name on both the Habits tab and the Today week planner.
- **Reorder** — small up/down controls let you pin habits within their
  current status group (a manual `order` field, materialized on first use).

---

## Phase 11 — Habit visualizations *(complete)*

The always-expanded 12-week heatmap is retired. Every habit card now shows a
compact, always-visible **week strip** (7 dots, Mon–Sun, tappable to log or
undo a day), with a "Show history" toggle that reveals a **schedule-aware**
detail view underneath — the app picks the shape that actually fits the
habit, not one generic grid for everything:

- **Daily / weekday habits** get a real **month calendar**, since individual
  days matter — easier to spot which specific day was missed than decoding
  a heatmap strip, with prev/next month navigation (capped at the current
  month).
- **Times-per-week habits** get **weekly completion bars** over the last 12
  weeks instead — the more honest view for that schedule, since only the
  week's count matters, with a thin target line marking the goal per bar.
- **Streak milestone badges** — the streak chip's flame swaps to a medal
  icon (with a subtle ring) once a streak crosses 7/14/30/60/100/200/365
  days (or 4/8/12/26/52 weeks for times-per-week habits).

All three views share one `cellState` helper under the hood, so the Phase 10
heatmap bug fix (a times-per-week habit no longer reads every day as
"missed") applies consistently everywhere — week strip, calendar, and the
retained `heatmapCells` function alike.

---

## Phase 12 — Reminder redesign + quick-add fix *(complete)*

Three real, reported problems fixed:

- **Quick-add had no visible Save button.** The sheet only submitted on
  Enter, which looked broken on desktop (no click target at all). It now
  has explicit **"Add task" / "Add event"** and **Cancel** buttons, always
  visible at the bottom of the sheet.
- **Reminder timing required mental math.** `ReminderSheet` used to make
  you type "minutes before" as a raw number. It's now a **clock time
  picker** — tap a preset ("30 min before") to auto-fill the exact time,
  or set the time field directly; no arithmetic required. The picker is
  shared (`ReminderPicker.tsx`) between the reminder sheet and quick-add.
- **No way to customize a reminder's message.** Notifications always used
  the task/event title. Each reminder can now carry an **optional custom
  message** — leave it blank to keep using the title, or write your own
  ("bring the charger").
- **Quick-add can now set reminders at creation time** — a collapsible
  "Remind me…" row using the same picker, so you don't have to save first
  and reopen the item just to add a reminder. (Project assignment and
  explicit date/time pickers were intentionally left out of quick-add to
  keep it minimal — reopen the item for those.)

Under the hood, a per-item reminder is now `{ offsetMin, message? }`
instead of a bare number (`db.ts`'s `ReminderEntry`); a negative
`offsetMin` fires *after* the anchor instead of before, which the "wrap it
up 10 min into the call" case needs. Old locally-stored plain-number
reminders are normalized on read (`normalizeReminders`/`effectiveReminders`
in `notify.ts`), so no migration or data loss for existing reminders.

---

## Planned — Phase 13/14 — Google sign-in + cross-device sync

Scoped but **not yet started** — this is a genuinely different kind of
project from everything else in LifeOS so far, because the app has been
100% local (IndexedDB via Dexie, zero backend, opens as a single offline
file). Splitting it in two:

**Phase 13 — foundation (hosting + Google sign-in, no data sync yet).**
Deploy LifeOS to a real URL (Google OAuth needs http/https, not `file://`)
and wire up Google sign-in via Firebase Auth. Data stays local per-device
at this stage — sign-in is identity only.

**Phase 14 — Firestore sync (the harder half).** Mirror tasks/events/
habits/reminders into Firestore so the same data shows up across devices,
with an offline queue and a conflict-resolution strategy, without breaking
the local-first/offline behavior that exists today.

**Blocked on the user for Phase 13** — none of this can be built/verified
until these exist, since they require an external account only the user
has:
1. A Firebase project (console.firebase.google.com), with the **Google**
   sign-in provider enabled under Authentication.
2. A hosting choice for the real URL — Firebase Hosting is the natural
   pairing (free tier, one CLI command), but Vercel/Netlify/GitHub Pages
   all work too.
3. The web app's Firebase config object (`apiKey`, `authDomain`,
   `projectId`, `storageBucket`, `messagingSenderId`, `appId`) from
   Project settings → General → "Your apps".

---

## Backlog — must-haves, roughly in priority order

1. **Recurring tasks** — repeat rules for tasks, not just habits.
2. **Search & filter** — no way to find a task or note as data grows.
3. **Undo for destructive actions** — `deleteTaskDeep` is permanent and the
   toast can't yet carry an action.
4. **Overdue & day-rollover** — nothing surfaces or carries forward
   yesterday's unfinished tasks; the selected day doesn't roll at midnight.
5. **PWA update prompt + offline indicator** — the service worker
   auto-activates; users should be told when a refresh is ready.
6. **Automated tests (Vitest)** — streak/forgiveness, XP/levels, and review
   computations are pure logic that deserves coverage.
7. **Accessibility pass** — focus trapping and Escape-to-close for sheets, a
   keyboard path for quick-add.

### Cleanup
- `src/screens/Placeholder.tsx` is orphaned since the Review tab replaced it.
