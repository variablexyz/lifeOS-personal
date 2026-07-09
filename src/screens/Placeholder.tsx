import type { ReactNode } from "react";

export default function Placeholder({
  icon,
  title,
  note,
}: {
  icon: ReactNode;
  title: string;
  note: string;
}) {
  return (
    <div className="screen">
      <div className="placeholder">
        <div className="ph-icon">{icon}</div>
        <h2>{title}</h2>
        <p>{note}</p>
      </div>
    </div>
  );
}
