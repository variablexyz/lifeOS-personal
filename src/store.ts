import { create } from "zustand";
import { todayStr } from "./lib/dates";

export type Tab = "today" | "habits" | "projects" | "review";

interface UIState {
  tab: Tab;
  setTab: (t: Tab) => void;

  selectedDay: string; // YYYY-MM-DD shown on Today screen
  setSelectedDay: (d: string) => void;

  quickAddOpen: boolean;
  setQuickAddOpen: (b: boolean) => void;

  detailTaskId: number | null;
  openTask: (id: number | null) => void;

  detailEventId: number | null;
  openEvent: (id: number | null) => void;

  /** null = closed · "new" = create · number = edit that habit */
  habitSheet: number | "new" | null;
  openHabitSheet: (v: number | "new" | null) => void;

  /** null = closed · "new" = create · number = edit that project */
  projectSheet: number | "new" | null;
  openProjectSheet: (v: number | "new" | null) => void;

  checkInOpen: boolean;
  setCheckInOpen: (b: boolean) => void;

  companionOpen: boolean;
  setCompanionOpen: (b: boolean) => void;

  settingsOpen: boolean;
  setSettingsOpen: (b: boolean) => void;

  /** which item's reminder picker is open, or null */
  reminderTarget: { kind: "task" | "event"; id: number } | null;
  openReminders: (v: { kind: "task" | "event"; id: number } | null) => void;

  toast: string | null;
  showToast: (msg: string | null) => void;
}

export const useUI = create<UIState>((set) => ({
  tab: "today",
  setTab: (tab) => set({ tab }),

  selectedDay: todayStr(),
  setSelectedDay: (selectedDay) => set({ selectedDay }),

  quickAddOpen: false,
  setQuickAddOpen: (quickAddOpen) => set({ quickAddOpen }),

  detailTaskId: null,
  openTask: (detailTaskId) => set({ detailTaskId }),

  detailEventId: null,
  openEvent: (detailEventId) => set({ detailEventId }),

  habitSheet: null,
  openHabitSheet: (habitSheet) => set({ habitSheet }),

  projectSheet: null,
  openProjectSheet: (projectSheet) => set({ projectSheet }),

  checkInOpen: false,
  setCheckInOpen: (checkInOpen) => set({ checkInOpen }),

  companionOpen: false,
  setCompanionOpen: (companionOpen) => set({ companionOpen }),

  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

  reminderTarget: null,
  openReminders: (reminderTarget) => set({ reminderTarget }),

  toast: null,
  showToast: (toast) => set({ toast }),
}));
