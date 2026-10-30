import type { Lifter, Metric } from "./types";
import { metricKg } from "./scoring";

/** "Club" thresholds in kg, ascending. e.g. 170 → "170kg Deadlift Club". */
export const CLUB_THRESHOLDS: Record<Metric, number[]> = {
  squat: [100, 140, 180, 220],
  bench: [60, 100, 140, 180],
  deadlift: [100, 140, 170, 200, 250],
  total: [250, 350, 450, 550, 650],
};

const METRIC_LABEL: Record<Metric, string> = {
  squat: "Squat",
  bench: "Bench",
  deadlift: "Deadlift",
  total: "Total",
};

export type BadgeTier = "bronze" | "volt" | "blood";

export interface ClubBadge {
  metric: Metric;
  thresholdKg: number;
  /** e.g. "170kg Deadlift Club" */
  label: string;
  tier: BadgeTier;
}

/** Highest club the given kg qualifies for, or null. */
export function getClubBadge(metric: Metric, kg: number): ClubBadge | null {
  const steps = CLUB_THRESHOLDS[metric];
  let idx = -1;
  steps.forEach((t, i) => {
    if (kg >= t) idx = i;
  });
  if (idx === -1) return null;

  const progress = steps.length === 1 ? 1 : idx / (steps.length - 1);
  const tier: BadgeTier = progress >= 0.75 ? "blood" : progress >= 0.34 ? "volt" : "bronze";

  return {
    metric,
    thresholdKg: steps[idx],
    label: `${steps[idx]}kg ${METRIC_LABEL[metric]} Club`,
    tier,
  };
}

/** Best badge per metric for a lifter (used by profile + Flex Card later). */
export function getLifterBadges(l: Lifter): ClubBadge[] {
  return (["squat", "bench", "deadlift", "total"] as Metric[])
    .map((m) => getClubBadge(m, metricKg(l, m)))
    .filter((b): b is ClubBadge => b !== null);
}

/** Tailwind classes for each tier (kept static so Tailwind can see them). */
export const BADGE_STYLES: Record<BadgeTier, string> = {
  bronze: "bg-iron-800 text-iron-300 ring-iron-700",
  volt: "bg-volt-400/10 text-volt-300 ring-volt-400/40",
  blood: "bg-blood-500/15 text-blood-300 ring-blood-500/50",
};
