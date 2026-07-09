import type { BuddyMood } from "../lib/xp";

/* The companion — a calm sprout-creature that reacts to consistency.
   Moods change the face; growth stage (from level) adds leaves.
   Always gentle: "rest" is sleepy, never disappointed. */

export default function Buddy({
  size = 56,
  mood = "content",
  stage = 1,
}: {
  size?: number;
  mood?: BuddyMood;
  stage?: 1 | 2 | 3;
}) {
  const h = (size * 50) / 56;

  // face parameters per mood
  const mouth =
    mood === "proud"
      ? "M22 32 q6 6 12 0"
      : mood === "happy"
      ? "M23 33 q5 4 10 0"
      : mood === "content"
      ? "M24 33.5 q4 2.5 8 0"
      : "M24 34.5 q4 1 8 0"; // rest — soft, calm
  const eyesClosed = mood === "rest";
  const blush = mood === "happy" || mood === "proud" ? 0.5 : 0.25;

  return (
    <svg
      className="buddy"
      width={size}
      height={h}
      viewBox="0 0 56 50"
      aria-label={`Your companion is ${mood === "rest" ? "resting" : mood}`}
      role="img"
    >
      {/* body */}
      <path
        d="M28 6 C40 6 48 16 48 27 C48 39 39 46 28 46 C17 46 8 39 8 27 C8 16 16 6 28 6 Z"
        fill="var(--accent)"
      />
      <path
        d="M28 6 C40 6 48 16 48 27 L8 27 C8 16 16 6 28 6 Z"
        fill="#ffffff"
        opacity=".12"
      />
      {/* eyes */}
      {eyesClosed ? (
        <>
          <path d="M18.5 26 q2.5 2 5 0" stroke="var(--bg)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M32.5 26 q2.5 2 5 0" stroke="var(--bg)" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="21" cy="26" r="2.6" fill="var(--bg)" />
          <circle cx="35" cy="26" r="2.6" fill="var(--bg)" />
        </>
      )}
      {/* mouth */}
      <path d={mouth} stroke="var(--bg)" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* blush */}
      <circle cx="15.5" cy="31" r="2.4" fill="var(--streak)" opacity={blush} />
      <circle cx="40.5" cy="31" r="2.4" fill="var(--streak)" opacity={blush} />
      {/* sprout — grows with level */}
      <path d="M28 6 q0 -4 3.5 -5" stroke="var(--accent)" strokeWidth="2" fill="none" strokeLinecap="round" />
      {stage >= 2 && (
        <path d="M28 4.5 q-3 -3.5 -6.5 -2.5 q1.5 3.5 6.5 2.5" fill="var(--accent)" />
      )}
      {stage >= 3 && (
        <>
          <path d="M31.5 1 q3 -2 5.5 0 q-2 2.8 -5.5 0" fill="var(--accent)" />
          <circle cx="31.8" cy="0.8" r="1.6" fill="var(--streak)" />
        </>
      )}
    </svg>
  );
}
