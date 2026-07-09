import { useState } from "react";
import { setFlag } from "../db";
import { seedSampleData } from "../seed";
import Buddy from "./Buddy";

export default function FirstRun({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  async function choose(seed: boolean) {
    if (busy) return;
    setBusy(true);
    if (seed) await seedSampleData();
    await setFlag("firstRunDone", true);
    onDone();
  }

  return (
    <div className="firstrun">
      <Buddy size={88} />
      <h1>Welcome to LifeOS</h1>
      <p>
        One calm place for your tasks, habits, and days. Want to look around
        with a sample day first?
      </p>
      <div className="actions">
        <button className="btn primary" disabled={busy} onClick={() => choose(true)}>
          Load a sample day
        </button>
        <button className="btn ghost" disabled={busy} onClick={() => choose(false)}>
          Start fresh
        </button>
      </div>
    </div>
  );
}
