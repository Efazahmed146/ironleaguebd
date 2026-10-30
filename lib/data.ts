import type { Experience, Lifter } from "./types";
import { ageGroupFor, weightClassFor } from "./categories";

/**
 * Data access layer.
 *
 * MVP: returns in-memory demo data. To go live, replace the body of
 * `getLifters` with a Supabase query on the `leaderboard` view
 * (see /supabase/schema.sql). The rest of the app depends only on this
 * function's signature.
 */

type Row = [
  id: string,
  name: string,
  sex: "M" | "F",
  bw: number,
  gym: string,
  district: string,
  area: string,
  age: number,
  exp: Experience,
  squat: number,
  bench: number,
  deadlift: number,
  verified: boolean,
  hasVideo: boolean,
];

// Demo data only: fictional names and gyms, placeholder proof links.
const ROWS: Row[] = [
  ["1", "Rakib Hasan", "M", 83, "Iron Temple", "Dhaka", "Mirpur", 27, "pro", 210, 135, 255, true, true],
  ["2", "Tanvir Ahmed", "M", 74, "Beast Mode Fitness", "Dhaka", "Dhanmondi", 24, "intermediate", 185, 120, 230, true, true],
  ["3", "Sabbir Rahman", "M", 93, "Titan Strength Lab", "Dhaka", "Uttara", 31, "pro", 230, 150, 270, true, true],
  ["4", "Nusrat Jahan", "F", 57, "Forge Women's Studio", "Dhaka", "Gulshan", 26, "intermediate", 120, 62.5, 150, true, true],
  ["5", "Imran Hossain", "M", 66, "Steel Republic", "Dhaka", "Mohammadpur", 22, "novice", 160, 100, 200, false, true],
  ["6", "Fahim Chowdhury", "M", 105, "Barbell Brotherhood", "Dhaka", "Bashundhara", 29, "pro", 260, 170, 300, true, true],
  ["7", "Mehedi Hasan", "M", 59, "Grind House", "Dhaka", "Mirpur", 19, "novice", 140, 85, 175, true, true],
  ["8", "Arif Mahmud", "M", 88, "Titan Strength Lab", "Dhaka", "Uttara", 41, "intermediate", 200, 130, 240, false, true],
  ["9", "Tasnim Akter", "F", 63, "Forge Women's Studio", "Dhaka", "Banani", 23, "novice", 105, 55, 135, true, true],
  ["10", "Shahriar Alam", "M", 78, "Concrete Jungle Gym", "Dhaka", "Dhanmondi", 25, "intermediate", 175, 112.5, 215, true, true],
  ["11", "Rafi Islam", "M", 70, "Iron Temple", "Dhaka", "Mirpur", 18, "novice", 150, 95, 190, false, false],
  ["12", "Farhana Yeasmin", "F", 69, "Steel Republic", "Dhaka", "Mohammadpur", 33, "intermediate", 130, 67.5, 160, true, true],
  ["13", "Nayeem Sarker", "M", 120, "Barbell Brotherhood", "Dhaka", "Bashundhara", 35, "pro", 285, 185, 325, true, true],
  ["14", "Jubayer Khan", "M", 81, "Concrete Jungle Gym", "Dhaka", "Motijheel", 28, "intermediate", 190, 125, 245, true, true],
  ["15", "Ahnaf Rahim", "M", 68, "Grind House", "Dhaka", "Gulshan", 20, "novice", 140, 90, 170, true, true],
  ["16", "Mim Chowdhury", "F", 52, "Beast Mode Fitness", "Dhaka", "Dhanmondi", 21, "novice", 90, 45, 115, false, true],
  ["17", "Zubair Karim", "M", 75, "Atlas Iron Club", "Chattogram", "Agrabad", 30, "intermediate", 165, 105, 205, false, false],
  ["18", "Sourav Das", "M", 82, "Port City Barbell", "Chattogram", "GEC", 26, "pro", 215, 140, 260, true, true],
  ["19", "Maruf Billah", "M", 73, "Sylhet Iron Works", "Sylhet", "Zindabazar", 23, "intermediate", 175, 115, 220, true, true],
  ["20", "Anika Tabassum", "F", 58, "Rajshahi Strength House", "Rajshahi", "Boalia", 25, "intermediate", 112.5, 60, 140, true, true],
  ["21", "Hasan Mahmud", "M", 94, "Khulna Power Club", "Khulna", "Sonadanga", 44, "intermediate", 205, 125, 235, true, true],
  ["22", "Rubel Mia", "M", 64, "Cumilla Iron Zone", "Cumilla", "Kandirpar", 17, "novice", 130, 80, 165, false, true],
  ["23", "Siam Ahmed", "M", 90, "Rangpur Barbell Club", "Rangpur", "Station Road", 38, "novice", 170, 110, 205, false, false],
  ["24", "Tahmid Rahman", "M", 77, "Bogura Gym Hub", "Bogura", "Satmatha", 22, "novice", 150, 95, 185, true, true],
];

export const LIFTERS: Lifter[] = ROWS.map(
  ([id, name, sex, bw, gym, district, area, age, exp, sq, bn, dl, verified, hasVideo]) => ({
    id,
    name,
    sex,
    age,
    bodyweightKg: bw,
    homeGym: gym,
    district,
    area,
    experience: exp,
    weightClass: weightClassFor(bw, sex) ?? undefined,
    ageGroup: ageGroupFor(age) ?? undefined,
    squatKg: sq,
    benchKg: bn,
    deadliftKg: dl,
    verified,
    videoUrl: hasVideo ? `https://example.com/proof/${id}` : undefined,
    updatedAt: `2026-10-${String(1 + (Number(id) % 24)).padStart(2, "0")}T10:00:00Z`,
  }),
);

export async function getLifters(): Promise<Lifter[]> {
  return LIFTERS;
}
