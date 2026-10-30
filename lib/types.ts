export type Sex = "M" | "F";
export type Lift = "squat" | "bench" | "deadlift";
export type Metric = Lift | "total";
export type Experience = "novice" | "intermediate" | "pro";
export type AgeGroup = "teen" | "junior" | "open" | "masters";

export interface Lifter {
  id: string;
  name: string;
  sex: Sex;
  age?: number;
  bodyweightKg: number;
  homeGym: string;
  /** One of Bangladesh's 64 districts. */
  district: string;
  /** Neighbourhood / thana (free text, optional). */
  area?: string;
  experience?: Experience;
  /** IPF class code such as "-83" or "+120". */
  weightClass?: string;
  ageGroup?: AgeGroup;
  /** Best judged "Good Lift" per lift, kg. */
  squatKg: number;
  benchKg: number;
  deadliftKg: number;
  /** Public proof link (Instagram reel, YouTube, Facebook video…). */
  videoUrl?: string;
  /** A judged proof video is on file. */
  proofOnFile?: boolean;
  /** Weigh-in AND entry fee confirmed by a moderator. */
  verified: boolean;
  /** ISO timestamp of the latest result. */
  updatedAt: string;
  /** Profile photo (data URL or https URL). */
  avatarUrl?: string;
  /** True for the signed-in lifter on this device. */
  isYou?: boolean;
  /** Active paid subscription: shows the Pro badge. */
  isPro?: boolean;
}
