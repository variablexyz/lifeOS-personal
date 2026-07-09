import { useEffect, useState } from "react";
import { getFlag } from "./db";
import { useUI, type Tab } from "./store";
import Today from "./screens/Today";
import Habits from "./screens/Habits";
import Projects from "./screens/Projects";
import Review from "./screens/Review";
import QuickAddSheet from "./components/QuickAddSheet";
import TaskDetailSheet from "./components/TaskDetailSheet";
import EventSheet from "./components/EventSheet";
import HabitSheet from "./components/HabitSheet";
import ProjectSheet from "./components/ProjectSheet";
import CheckInSheet from "./components/CheckInSheet";
import CompanionSheet from "./components/CompanionSheet";
import Toast from "./components/Toast";
import FirstRun from "./components/FirstRun";
import Settings from "./screens/Settings";
import ReminderSheet from "./components/ReminderSheet";
import Reminders from "./components/Reminders";
import { applyTheme, loadThemePref } from "./lib/theme";
import {
  IconCalendar,
  IconChart,
  IconFolder,
  IconPlus,
  IconRepeat,
} from "./components/icons";

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: "today", label: "Today", icon: <IconCalendar /> },
  { id: "habits", label: "Habits", icon: <IconRepeat /> },
  { id: "projects", label: "Projects", icon: <IconFolder /> },
  { id: "review", label: "Review", icon: <IconChart /> },
];

export default function App() {
  const { tab, setTab, setQuickAddOpen } = useUI();
  const [firstRun, setFirstRun] = useState<boolean | null>(null);

  useEffect(() => {
    getFlag<boolean>("firstRunDone").then((done) => setFirstRun(!done));
  }, []);

  useEffect(() => {
    loadThemePref().then(applyTheme);
  }, []);

  if (firstRun === null) return null;
  if (firstRun) return <FirstRun onDone={() => setFirstRun(false)} />;

  return (
    <div className="app">
      {tab === "today" && <Today />}
      {tab === "habits" && <Habits />}
      {tab === "projects" && <Projects />}
      {tab === "review" && <Review />}

      <button className="fab" aria-label="Quick add" onClick={() => setQuickAddOpen(true)}>
        <IconPlus />
      </button>

      <nav className="nav" aria-label="Main navigation">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "on" : ""}
            onClick={() => setTab(t.id)}
          >
            <span className="pill">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <QuickAddSheet />
      <TaskDetailSheet />
      <EventSheet />
      <HabitSheet />
      <ProjectSheet />
      <CheckInSheet />
      <CompanionSheet />
      <Settings />
      <ReminderSheet />
      <Toast />
      <Reminders />
    </div>
  );
}
