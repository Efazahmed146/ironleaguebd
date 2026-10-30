import Link from "next/link";
import { PencilLine, Share2, Trophy } from "lucide-react";
import type { PRRecord, Profile } from "@/lib/account";
import { calculateDots } from "@/lib/scoring";
import { formatKg, formatScore } from "@/lib/format";

/** "Your PRs" card at the top of the profile page. */
export function PRSummary({ profile, pr }: { profile: Profile; pr: PRRecord | null }) {
  const hasAny = pr && pr.squatKg + pr.benchKg + pr.deadliftKg > 0;

  if (!pr || !hasAny) {
    return (
      <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="font-display text-2xl font-extrabold uppercase">No PR logged yet</p>
          <p className="text-sm text-iron-400">Add your lifts and get on the leaderboard.</p>
        </div>
        <Link href="/log" className="btn-volt">
          <Trophy className="h-5 w-5" /> Log my first PR
        </Link>
      </div>
    );
  }

  const complete = pr.squatKg > 0 && pr.benchKg > 0 && pr.deadliftKg > 0;
  const total = pr.squatKg + pr.benchKg + pr.deadliftKg;
  const dots = complete ? calculateDots(total, profile.bodyweightKg, profile.sex) : 0;

  const items = [
    { label: "Squat", value: pr.squatKg },
    { label: "Bench", value: pr.benchKg },
    { label: "Deadlift", value: pr.deadliftKg },
  ];

  return (
    <div className="panel space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">Your PRs</p>
        <p className="text-xs text-iron-500">
          Updated {new Date(pr.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {items.map((i) => (
          <div key={i.label} className="rounded-xl bg-iron-950 p-3 text-center ring-1 ring-iron-800">
            <p className="text-[11px] font-bold uppercase tracking-stencil text-iron-500">{i.label}</p>
            <p className="font-display text-3xl font-black tabular-nums">
              {i.value > 0 ? formatKg(i.value) : "—"}
              {i.value > 0 && <span className="ml-1 text-xs text-iron-500">kg</span>}
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
        <Link href="/log" className="btn-volt">
          <PencilLine className="h-5 w-5" /> Broke a PR? Update it
        </Link>
        <Link href="/flex" className="btn-ghost">
          <Share2 className="h-5 w-5" /> Flex card
        </Link>
      </div>
    </div>
  );
}
