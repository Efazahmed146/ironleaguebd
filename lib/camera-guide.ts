import type { Lift } from "./types";

/**
 * On-screen alignment guide shown over the live camera.
 * `lines` are horizontal reference lines (y = % from the top of the screen).
 */
export interface CameraGuide {
  angle: string;
  tips: string[];
  lines: { y: number; label: string }[];
}

const COMMON = [
  "Turn your phone sideways (landscape).",
  "Place it 2–3 m away, side-on to you, around hip height.",
  "Keep the whole lifter, bar and plates inside the frame.",
];

export const CAMERA_GUIDE: Record<Lift, CameraGuide> = {
  squat: {
    angle: "Side view (90°) or 45° front-side. Depth must be clearly visible.",
    tips: [...COMMON, "Your hip and knee must both be visible at the bottom."],
    lines: [
      { y: 62, label: "KNEE LEVEL: hip crease must go below this" },
      { y: 90, label: "FLOOR" },
    ],
  },
  bench: {
    angle: "Side view. Chest, bar, bum and feet all visible.",
    tips: [...COMMON, "Show the bar touching your chest and your feet flat on the floor."],
    lines: [
      { y: 58, label: "BENCH LEVEL" },
      { y: 90, label: "FLOOR" },
    ],
  },
  deadlift: {
    angle: "Side view. Whole body from feet to head, bar at the floor.",
    tips: [...COMMON, "Stand tall at the top so lockout (hips, knees, shoulders) is clear."],
    lines: [
      { y: 52, label: "HIP LOCKOUT: finish with hips here, shoulders back" },
      { y: 90, label: "FLOOR" },
    ],
  },
};
