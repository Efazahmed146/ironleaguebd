import type { AgeGroup, Experience, Lifter, Metric, Sex } from "./types";
import { metricDots, metricKg, relativeStrength } from "./scoring";
import { getClubBadge, type ClubBadge } from "./badges";

export type RankMode = "pound-for-pound" | "absolute";

export interface LeaderboardFilters {
  metric: Metric;
  /** "all" or a district name such as "Dhaka". */
  district: string;
  /** "all" or an IPF class code such as "-83". */
  weightClass: string;
  experience: "all" | Experience;
  ageGroup: "all" | AgeGroup;
  sex: "all" | Sex;
  verifiedOnly: boolean;
  mode: RankMode;
  query: string;
}

export const DEFAULT_FILTERS: LeaderboardFilters = {
  metric: "total",
  district: "all",
  weightClass: "all",
  experience: "all",
  ageGroup: "all",
  sex: "all",
  verifiedOnly: false,
  mode: "pound-for-pound",
  query: "",
};

export interface RankedLifter {
  lifter: Lifter;
  rank: number;
  /** Absolute kg for the selected metric. */
  kg: number;
  /** DOTS score for the selected metric. */
  dots: number;
  /** Lift ÷ bodyweight. */
  ratio: number;
  /** Club badge for the selected metric. */
  badge: ClubBadge | null;
}

export function getDistricts(lifters: Lifter[]): string[] {
  return [...new Set(lifters.map((l) => l.district).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/**
 * Filter, score, sort and rank. Pure function → trivial to unit test and to
 * move server-side (Supabase view / RPC) later.
 */
export function buildLeaderboard(lifters: Lifter[], f: LeaderboardFilters): RankedLifter[] {
  const q = f.query.trim().toLowerCase();

  const scored = lifters
    .filter((l) => f.district === "all" || l.district === f.district)
    .filter((l) => f.weightClass === "all" || l.weightClass === f.weightClass)
    .filter((l) => f.experience === "all" || l.experience === f.experience)
    .filter((l) => f.ageGroup === "all" || l.ageGroup === f.ageGroup)
    .filter((l) => f.sex === "all" || l.sex === f.sex)
    .filter((l) => !f.verifiedOnly || l.verified)
    .filter(
      (l) => !q || l.name.toLowerCase().includes(q) || l.homeGym.toLowerCase().includes(q),
    )
    .map((lifter) => {
      const kg = metricKg(lifter, f.metric);
      return {
        lifter,
        kg,
        dots: metricDots(lifter, f.metric),
        ratio: relativeStrength(kg, lifter.bodyweightKg),
        badge: getClubBadge(f.metric, kg),
      };
    })
    // A lifter with 0 kg for this metric has no Good Lift yet — leave them off.
    .filter((r) => r.kg > 0);

  const sortValue = (r: (typeof scored)[number]) =>
    f.mode === "pound-for-pound" ? r.dots : r.kg;

  scored.sort(
    (a, b) =>
      sortValue(b) - sortValue(a) ||
      // Tie-breakers (IPF-style): lighter lifter wins, then earlier result.
      a.lifter.bodyweightKg - b.lifter.bodyweightKg ||
      a.lifter.updatedAt.localeCompare(b.lifter.updatedAt),
  );

  // Standard competition ranking: equal scores share a rank (1, 2, 2, 4…).
  let prevValue = Number.NaN;
  let prevRank = 0;
  return scored.map((r, i) => {
    const v = sortValue(r);
    const rank = v === prevValue ? prevRank : i + 1;
    prevValue = v;
    prevRank = rank;
    return { ...r, rank };
  });
}
