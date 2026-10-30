import type { Lifter, Metric, Sex } from "./types";

/**
 * Relative-strength scoring.
 *
 * We use DOTS (Dynamic Object Team Scoring), the bodyweight-adjusted formula
 * adopted by modern powerlifting federations as the successor to Wilks:
 *
 *   DOTS = lift × 500 / (a + b·bw + c·bw² + d·bw³ + e·bw⁴)
 *
 * A 500-point DOTS ≈ a very strong competitive lifter. Using one polynomial per
 * sex keeps ranking fair across bodyweights (a 60 kg and a 120 kg lifter can
 * be compared on the same board).
 *
 * The same formula is applied to a single lift or the total, so the
 * "pound-for-pound" toggle works for every leaderboard tab.
 */

interface DotsCoefficients {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  /** Bodyweight range the polynomial is valid for (kg). */
  minBw: number;
  maxBw: number;
}

const DOTS: Record<Sex, DotsCoefficients> = {
  M: {
    a: -307.75076,
    b: 24.0900756,
    c: -0.1918759221,
    d: 0.0007391293,
    e: -0.000001093,
    minBw: 40,
    maxBw: 210,
  },
  F: {
    a: -57.96288,
    b: 13.6175032,
    c: -0.1126655495,
    d: 0.0005158568,
    e: -0.0000010706,
    minBw: 40,
    maxBw: 150,
  },
};

export const DOTS_COEFFICIENTS = DOTS;

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/** Denominator of the DOTS formula for a given bodyweight. */
export function dotsDenominator(bodyweightKg: number, sex: Sex): number {
  const k = DOTS[sex];
  const bw = clamp(bodyweightKg, k.minBw, k.maxBw);
  return k.a + k.b * bw + k.c * bw ** 2 + k.d * bw ** 3 + k.e * bw ** 4;
}

/**
 * DOTS score for a lift (or total) in kg. Returns 0 for invalid input.
 * Rounded to 2 decimals.
 */
export function calculateDots(
  liftKg: number,
  bodyweightKg: number,
  sex: Sex = "M",
): number {
  if (!Number.isFinite(liftKg) || !Number.isFinite(bodyweightKg)) return 0;
  if (liftKg <= 0 || bodyweightKg <= 0) return 0;
  const score = (liftKg * 500) / dotsDenominator(bodyweightKg, sex);
  return Math.round(score * 100) / 100;
}

/** Plain "× bodyweight" ratio — easy for gym bros to understand (e.g. 3.1×). */
export function relativeStrength(liftKg: number, bodyweightKg: number): number {
  if (liftKg <= 0 || bodyweightKg <= 0) return 0;
  return Math.round((liftKg / bodyweightKg) * 100) / 100;
}

export function totalKg(l: Pick<Lifter, "squatKg" | "benchKg" | "deadliftKg">) {
  return l.squatKg + l.benchKg + l.deadliftKg;
}

/** Absolute kg for a metric. Total requires all three lifts to be logged. */
export function metricKg(l: Lifter, metric: Metric): number {
  switch (metric) {
    case "squat":
      return l.squatKg;
    case "bench":
      return l.benchKg;
    case "deadlift":
      return l.deadliftKg;
    case "total":
      return l.squatKg > 0 && l.benchKg > 0 && l.deadliftKg > 0 ? totalKg(l) : 0;
  }
}

/** DOTS for a metric (single lift or total). */
export function metricDots(l: Lifter, metric: Metric): number {
  return calculateDots(metricKg(l, metric), l.bodyweightKg, l.sex);
}
