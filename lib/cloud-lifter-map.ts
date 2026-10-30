import type { Experience, Lifter } from "./types";
import { ageGroupFor, weightClassFor } from "./categories";

export type Row = {
  id: string;
  name: string | null;
  sex: string | null;
  age: number | null;
  district: string | null;
  area: string | null;
  home_gym: string | null;
  experience: string | null;
  weight_class: string | null;
  is_pro: boolean | null;
  squat_kg: number | string;
  bench_kg: number | string;
  deadlift_kg: number | string;
  bodyweight_kg: number | string | null;
  has_proof: boolean | null;
  verified: boolean | null;
  updated_at: string;
};

export function rowToLifter(r: Row): Lifter {
  const sex = r.sex === "F" ? "F" : "M";
  const bw = Number(r.bodyweight_kg ?? 0);
  return {
    id: r.id,
    name: r.name || "Lifter",
    sex,
    age: r.age ?? undefined,
    bodyweightKg: bw,
    homeGym: r.home_gym ?? "",
    district: r.district ?? "",
    area: r.area ?? undefined,
    experience: (r.experience as Experience | null) ?? undefined,
    weightClass: r.weight_class ?? (bw > 0 ? (weightClassFor(bw, sex) ?? undefined) : undefined),
    ageGroup: ageGroupFor(r.age ?? undefined) ?? undefined,
    squatKg: Number(r.squat_kg),
    benchKg: Number(r.bench_kg),
    deadliftKg: Number(r.deadlift_kg),
    proofOnFile: Boolean(r.has_proof),
    verified: Boolean(r.verified),
    updatedAt: r.updated_at,
    isPro: Boolean(r.is_pro),
  };
}

