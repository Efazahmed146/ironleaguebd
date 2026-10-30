import { MEET } from "./meet";

/**
 * Display copy for the plans. The REAL prices live in the `plans` table
 * (supabase/setup.sql) and are enforced by a database trigger, so keep them in sync.
 * PLACEHOLDER prices: change them in both places.
 */
export interface Plan {
  id: "season" | "year";
  label: string;
  priceBdt: number;
  days: number;
  blurb: string;
}

export const PLANS: Plan[] = [
  { id: "season", label: "Season pass", priceBdt: 500, days: 90, blurb: "90 days of full access" },
  { id: "year", label: "Annual pass", priceBdt: 1500, days: 365, blurb: "365 days, best value" },
];

export const PRO_PERKS = [
  "Join competitions and record unlimited attempts",
  "Compete against lifters from all 64 districts",
  "Verified Pro badge on your profile and the leaderboard",
  "Flex Card to share your official results",
  "Your full history (PRs, attempts, scores, videos) saved to your account",
];

export const GUEST_PERKS = [
  "Live leaderboards, filtered by district and class",
  "Browse other lifters' profiles and lifts",
  "Read the rules and lift standards",
];

export const PAY_TO = MEET.payTo;
