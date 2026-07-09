/* Minimal Lucide-style inline icon set — one consistent stroke family. */

interface IconProps {
  size?: number;
  strokeWidth?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconPlus = ({ size = 24, strokeWidth = 2.4 }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconCheck = ({ size = 12, strokeWidth = 3.2 }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth} stroke="#fff">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const IconChevronLeft = ({ size = 20, strokeWidth = 2.2 }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const IconChevronRight = ({ size = 20, strokeWidth = 2.2 }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const IconCalendar = ({ size = 21, strokeWidth = 2 }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth}>
    <rect x="3" y="4" width="18" height="17" rx="4" />
    <path d="M8 2v4M16 2v4M3 9h18" />
  </svg>
);

export const IconRepeat = ({ size = 21, strokeWidth = 2 }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </svg>
);

export const IconTimer = ({ size = 21, strokeWidth = 2 }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2.5M9 2h6" />
  </svg>
);

export const IconChart = ({ size = 21, strokeWidth = 2 }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth}>
    <path d="M6 20v-5M12 20V9M18 20V4" />
  </svg>
);

export const IconFlame = ({ size = 11 }: IconProps) => (
  <svg width={size} height={size * 1.2} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2c1 3 3 5 5 7a7 7 0 1 1-11 6c0-2 1-4 2-5 0 2 1 3 2 3-1-4 0-8 2-11z" />
  </svg>
);

export const IconTrash = ({ size = 16, strokeWidth = 2 }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

export const IconSettings = ({ size = 21, strokeWidth = 2 }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const IconBell = ({ size = 18, strokeWidth = 2 }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export const IconFolder = ({ size = 21, strokeWidth = 2 }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
);

export const IconChevronUp = ({ size = 20, strokeWidth = 2.2 }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth}>
    <path d="m18 15-6-6-6 6" />
  </svg>
);

export const IconChevronDown = ({ size = 20, strokeWidth = 2.2 }: IconProps) => (
  <svg {...base(size)} strokeWidth={strokeWidth}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconMoon = ({ size = 12 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
  </svg>
);

export const IconMedal = ({ size = 12 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 3h8l-2 7.5-2-1-2 1L8 3z" opacity="0.75" />
    <circle cx="12" cy="15.5" r="6.5" />
  </svg>
);
