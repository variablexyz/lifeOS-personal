import { useEffect, useRef } from "react";
import { useUI } from "../store";
import { useLevel } from "../lib/xp";

/** Gentle toast: shows store messages, and watches for level-ups. */
export default function Toast() {
  const { toast, showToast } = useUI();
  const level = useLevel();
  const prevLevel = useRef<number | null>(null);

  // level-up watcher — reactive, no coupling in the data layer
  useEffect(() => {
    if (prevLevel.current !== null && level.level > prevLevel.current) {
      showToast(`Level ${level.level} — your companion grew a little`);
    }
    prevLevel.current = level.level;
  }, [level.level, showToast]);

  // auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => showToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast, showToast]);

  if (!toast) return null;
  return (
    <div className="toast" role="status">
      {toast}
    </div>
  );
}
