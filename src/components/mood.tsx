/* Mood faces 1–5, drawn — never emoji. Low moods stay gentle and
   neutral: no reds, no frowning guilt. */

export const MOOD_WORDS = ["", "Rough", "Meh", "Okay", "Good", "Great"];
export const ENERGY_WORDS = ["", "Drained", "Low", "Steady", "Fresh", "Charged"];

export function MoodFace({ v, size = 34 }: { v: 1 | 2 | 3 | 4 | 5; size?: number }) {
  // mouth curvature: -3 (soft down) … +5 (big smile); eyes soften upward
  const curve = [-3, -1.5, 0, 2.5, 5][v - 1];
  const eyeR = v >= 4 ? 1.9 : 1.7;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.14" />
      <circle cx="8.5" cy="10" r={eyeR} fill="currentColor" />
      <circle cx="15.5" cy="10" r={eyeR} fill="currentColor" />
      <path
        d={`M8 ${15.5 - curve / 2} q4 ${curve * 1.6} 8 0`}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function EnergyDots({ v, size = 8 }: { v: 1 | 2 | 3 | 4 | 5; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            width: size,
            height: size + (i <= v ? i : 0),
            borderRadius: 2,
            background: "currentColor",
            opacity: i <= v ? 1 : 0.25,
          }}
        />
      ))}
    </span>
  );
}
