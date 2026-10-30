import Link from "next/link";
import { ProBadge } from "@/components/account/ProBadge";
import { Clock, MapPin, PencilLine, PlayCircle, ShieldCheck } from "lucide-react";
import type { RankedLifter, RankMode } from "@/lib/leaderboard";
import { BADGE_STYLES } from "@/lib/badges";
import { formatKg, formatRatio, formatScore, initials } from "@/lib/format";
import { classLabel } from "@/lib/categories";

/** Shared grid so the header row and data rows line up on ≥ sm screens. */
export const ROW_GRID =
  "grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-2 sm:grid-cols-[3.5rem_minmax(0,1fr)_5rem_7.5rem_8rem] sm:gap-4";

const RANK_STYLE: Record<number, string> = {
  1: "text-volt-400",
  2: "text-iron-200",
  3: "text-orange-400",
};

export function LeaderboardRow({
  entry,
  mode,
  index,
}: {
  entry: RankedLifter;
  mode: RankMode;
  index: number;
}) {
  const { lifter, rank, kg, dots, ratio, badge } = entry;
  const p4p = mode === "pound-for-pound";
  const top = rank === 1;

  const primary = p4p ? formatScore(dots) : formatKg(kg);
  const primaryUnit = p4p ? "DOTS" : "KG";
  const secondary = p4p ? `${formatKg(kg)} kg` : `${formatScore(dots)} DOTS`;

  return (
    <li
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
      className={`${ROW_GRID} relative animate-rise px-3 py-3 transition hover:bg-iron-850 sm:px-5 sm:py-3.5 ${
        top ? "bg-volt-400/[0.06] shadow-[inset_3px_0_0_theme(colors.volt.400)]" : ""
      } ${lifter.isYou && !top ? "bg-blood-500/[0.07] shadow-[inset_3px_0_0_theme(colors.blood.500)]" : ""}`}
    >
      {/* Rank */}
      <span
        className={`font-display text-2xl font-black leading-none tabular-nums sm:text-4xl ${
          RANK_STYLE[rank] ?? "text-iron-500"
        }`}
      >
        {rank}
      </span>

      {/* Lifter */}
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        {lifter.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lifter.avatarUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover sm:h-11 sm:w-11 ring-2 ring-volt-400/60"
          />
        ) : (
          <span
            aria-hidden
            className={`grid h-10 w-10 shrink-0 sm:h-11 sm:w-11 place-items-center rounded-full font-display text-lg font-extrabold ring-2 ${
              lifter.sex === "F"
                ? "bg-blood-500/15 text-blood-300 ring-blood-500/40"
                : "bg-iron-800 text-iron-200 ring-iron-700"
            }`}
          >
            {initials(lifter.name)}
          </span>
        )}

        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-semibold text-iron-50 sm:flex-nowrap sm:truncate">
            <Link
              href={`/athlete/${lifter.id}`}
              className="break-words leading-tight after:absolute sm:truncate after:inset-0 after:content-[''] hover:text-volt-300 focus-visible:outline-none focus-visible:text-volt-300"
              aria-label={`View ${lifter.name}'s profile`}
            >
              {lifter.name}
            </Link>
            {lifter.isYou && (
              <span className="chip shrink-0 bg-volt-400 text-iron-950 ring-volt-400">You</span>
            )}
            {lifter.isPro && <ProBadge compact />}
            {lifter.verified ? (
              <ShieldCheck
                className="h-4 w-4 shrink-0 text-volt-400"
                aria-label="Verified lifter"
              />
            ) : (
              <Clock
                className="h-3.5 w-3.5 shrink-0 text-iron-500"
                aria-label="Verification pending"
              />
            )}
          </p>

          <p className="mt-0.5 flex items-start gap-1 text-xs text-iron-400 sm:items-center sm:truncate">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0 sm:mt-0" />
            <span className="break-words sm:truncate">
              {lifter.homeGym} · {lifter.district}
            </span>
          </p>

          <div className="mt-1.5 hidden flex-wrap items-center gap-1.5 sm:flex">
            {badge && (
              <span className={`chip ${BADGE_STYLES[badge.tier]}`}>{badge.label}</span>
            )}
            {lifter.weightClass && (
              <span className="chip bg-iron-900 text-iron-400 ring-iron-700">
                {classLabel(lifter.weightClass)}
              </span>
            )}
            {lifter.videoUrl ? (
              <a
                href={lifter.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="chip relative z-10 bg-iron-900 text-iron-300 ring-iron-700 transition hover:text-volt-300 hover:ring-volt-400/50"
              >
                <PlayCircle className="h-3 w-3" /> Proof
              </a>
            ) : lifter.proofOnFile ? (
              <span className="chip bg-iron-900 text-iron-400 ring-iron-700">
                <PlayCircle className="h-3 w-3" /> Judged video
              </span>
            ) : null}
            {lifter.isYou && (
              <Link
                href="/compete/attempts"
                className="chip relative z-10 bg-volt-400/10 text-volt-300 ring-volt-400/40 transition hover:bg-volt-400/20"
              >
                <PencilLine className="h-3 w-3" /> My attempts
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Bodyweight (≥ sm) */}
      <span className="hidden text-right tabular-nums text-iron-300 sm:block">
        {formatKg(lifter.bodyweightKg)}
        <span className="ml-1 text-xs text-iron-500">kg</span>
      </span>

      {/* Secondary metric (≥ sm) */}
      <span className="hidden text-right sm:block">
        <span className="block font-semibold tabular-nums text-iron-200">{secondary}</span>
        <span className="block text-xs tabular-nums text-iron-500">
          {formatRatio(ratio)} BW
        </span>
      </span>

      {/* Primary metric */}
      <span className="text-right leading-none">
        <span
          className={`font-display text-2xl font-black leading-none tabular-nums sm:text-4xl ${
            top ? "text-volt-400" : "text-iron-50"
          }`}
        >
          {primary}
        </span>
        <span className="ml-0.5 block font-display text-[10px] font-bold tracking-widest text-iron-500 sm:ml-1 sm:inline sm:text-xs">
          {primaryUnit}
        </span>
      </span>
      {/* Mobile: badges and stats get their own full-width row so nothing is squeezed */}
      <div className="col-span-3 flex flex-wrap items-center gap-1.5 sm:hidden">
            {badge && (
              <span className={`chip ${BADGE_STYLES[badge.tier]}`}>{badge.label}</span>
            )}
            {lifter.weightClass && (
              <span className="chip bg-iron-900 text-iron-400 ring-iron-700">
                {classLabel(lifter.weightClass)}
              </span>
            )}
            {lifter.videoUrl ? (
              <a
                href={lifter.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="chip relative z-10 bg-iron-900 text-iron-300 ring-iron-700 transition hover:text-volt-300 hover:ring-volt-400/50"
              >
                <PlayCircle className="h-3 w-3" /> Proof
              </a>
            ) : lifter.proofOnFile ? (
              <span className="chip bg-iron-900 text-iron-400 ring-iron-700">
                <PlayCircle className="h-3 w-3" /> Judged video
              </span>
            ) : null}
            {lifter.isYou && (
              <Link
                href="/compete/attempts"
                className="chip relative z-10 bg-volt-400/10 text-volt-300 ring-volt-400/40 transition hover:bg-volt-400/20"
              >
                <PencilLine className="h-3 w-3" /> My attempts
              </Link>
            )}
        <span className="text-[11px] text-iron-400">
          {lifter.bodyweightKg} kg BW · {secondary}
        </span>
      </div>
    </li>
  );
}
