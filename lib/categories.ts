import type { AgeGroup, Experience, Sex } from "./types";

/* ---------- Experience levels ---------- */

export const EXPERIENCE: {
  id: Experience;
  label: string;
  short: string;
  blurb: string;
}[] = [
  {
    id: "novice",
    label: "Novice / Beginner",
    short: "Novice",
    blurb: "Under about 1 year of serious training and never competed in a federation meet.",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    short: "Intermediate",
    blurb: "1–3 years of consistent lifting. May have done gym or local competitions.",
  },
  {
    id: "pro",
    label: "Pro / Open",
    short: "Pro / Open",
    blurb: "3+ years, federation or national-level meets, or elite totals. No restrictions.",
  },
];

export const experienceLabel = (e: Experience) =>
  EXPERIENCE.find((x) => x.id === e)?.short ?? e;

/* ---------- IPF weight classes ---------- */
/** "-83" = up to and including 83 kg. "+120" = above 120 kg. */

export const WEIGHT_CLASSES: Record<Sex, string[]> = {
  M: ["-59", "-66", "-74", "-83", "-93", "-105", "-120", "+120"],
  F: ["-47", "-52", "-57", "-63", "-69", "-76", "-84", "+84"],
};

export const ALL_CLASSES = [...WEIGHT_CLASSES.M, ...WEIGHT_CLASSES.F];

export function weightClassFor(bodyweightKg: number, sex: Sex): string | null {
  if (!(bodyweightKg > 0)) return null;
  const list = WEIGHT_CLASSES[sex];
  for (const c of list) {
    if (c.startsWith("-") && bodyweightKg <= Number(c.slice(1))) return c;
  }
  return list[list.length - 1]!;
}

export const classLabel = (c: string) => (c.startsWith("+") ? `${c.slice(1)}+ kg` : `${c} kg`);

/** Allowed bodyweight range for a class: min is exclusive, max inclusive (null = no limit). */
export function classRange(c: string, sex: Sex): { min: number; max: number | null } {
  const list = WEIGHT_CLASSES[sex];
  const i = list.indexOf(c);
  const min = i <= 0 ? 0 : Number(list[i - 1]!.slice(1));
  return { min, max: c.startsWith("-") ? Number(c.slice(1)) : null };
}

/* ---------- Age groups ---------- */

export const MIN_AGE = 14;

export const AGE_GROUPS: { id: AgeGroup; label: string; range: string; min: number; max: number | null }[] = [
  { id: "teen", label: "Teenager", range: "14–19", min: 14, max: 19 },
  { id: "junior", label: "Junior", range: "20–23", min: 20, max: 23 },
  { id: "open", label: "Open", range: "24–39", min: 24, max: 39 },
  { id: "masters", label: "Masters", range: "40+", min: 40, max: null },
];

export function ageGroupFor(age: number | undefined): AgeGroup | null {
  if (!age || !Number.isFinite(age) || age < MIN_AGE) return null;
  return AGE_GROUPS.find((g) => age >= g.min && (g.max === null || age <= g.max))!.id;
}

export const ageGroupLabel = (g: AgeGroup) => {
  const x = AGE_GROUPS.find((a) => a.id === g)!;
  return `${x.label} (${x.range})`;
};
