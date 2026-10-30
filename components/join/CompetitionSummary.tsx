import Link from "next/link";
import { Medal, Share2 } from "lucide-react";
import type { Profile } from "@/lib/account";
import { ageGroupFor, ageGroupLabel, classLabel, experienceLabel } from "@/lib/categories";
import { entryLifts, isOfficial, MEET, type MeetEntry } from "@/lib/meet";
import { calculateDots } from "@/lib/scoring";
import { formatKg, formatScore } from "@/lib/format";

/** Competition card at the top of the profile page. */
export function CompetitionSummary({
  profile,
  entry,
}: {
  profile: Profile;
  entry: MeetEntry | null;
}) {
  if (!entry) {
    return (
      <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="font-display text-2xl font-extrabold uppercase">Not entered yet</p>
          <p className="text-sm text-iron-400">Pick your category and enter {MEET.name}.</p>
        </div>
        <Link href="/compete" className="btn-volt">
          <Medal className="h-5 w-5" /> Enter the competition
        </Link>
      </div>
    );
  }

  const lifts = entryLifts(entry);
  const complete = lifts.squatKg > 0 && lifts.benchKg > 0 && lifts.deadliftKg > 0;
  const total = lifts.squatKg + lifts.benchKg + lifts.deadliftKg;
  const dots = complete ? calculateDots(total, profile.bodyweightKg, profile.sex) : 0;
  const ag = ageGroupFor(profile.age);

  return (
    <div className="panel space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">{MEET.name}</p>
        <span
          className={`chip ${
            isOfficial(entry)
              ? "bg-volt-400/10 text-volt-300 ring-volt-400/40"
              : "bg-iron-800 text-iron-300 ring-iron-700"
          }`}
        >
          {isOfficial(entry) ? "Official" : "Provisional"}
        </span>
      </div>

      <p className="text-sm text-iron-300">
        {profile.sex === "M" ? "Men" : "Women"} {classLabel(entry.weightClass)} ·{" "}
        {experienceLabel(entry.experience)}
        {ag ? ` · ${ageGroupLabel(ag)}` : ""} · {profile.district}
      </p>

      <div className="grid grid-cols-3 gap-3">
        {[
          ["Squat", lifts.squatKg],
          ["Bench", lifts.benchKg],
          ["Deadlift", lifts.deadliftKg],
        ].map(([label, v]) => (
          <div key={label as string} className="rounded-xl bg-iron-950 p-3 text-center ring-1 ring-iron-800">
            <p className="text-[11px] font-bold uppercase tracking-stencil text-iron-500">{label}</p>
            <p className="font-display text-3xl font-black tabular-nums">
              {(v as number) > 0 ? formatKg(v as number) : "—"}
              {(v as number) > 0 && <span className="ml-1 text-xs text-iron-500">kg</span>}
            </p>
          </div>
        ))}
      </div>

      {complete && (
        <p className="font-display text-2xl font-extrabold">
          <span className="text-volt-400">{formatKg(total)} kg</span> total ·{" "}
          <span className="text-volt-400">{formatScore(dots)}</span> DOTS
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href="/compete" className="btn-volt">
          <Medal className="h-5 w-5" /> Competition hub
        </Link>
        <Link href="/flex" className="btn-ghost">
          <Share2 className="h-5 w-5" /> Flex card
        </Link>
      </div>
    </div>
  );
}
