"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Share2, Circle, Clock, Lock, XCircle } from "lucide-react";
import { useAccount, useIsClient } from "@/lib/account";
import { classLabel, experienceLabel } from "@/lib/categories";
import { LIFTS, MEET, bestGood, canLift, demoFillResults, feeRequired, isOfficial, paymentLabel } from "@/lib/meet";
import { saveEntry } from "@/lib/account";

type StepState = "done" | "review" | "todo" | "locked" | "rejected";

const STATE_STYLE: Record<StepState, { label: string; chip: string }> = {
  done: { label: "Done", chip: "bg-volt-400 text-iron-950 ring-volt-400" },
  review: { label: "In review", chip: "bg-iron-800 text-iron-200 ring-iron-700" },
  todo: { label: "To do", chip: "bg-volt-400/10 text-volt-300 ring-volt-400/40" },
  locked: { label: "Locked", chip: "bg-iron-900 text-iron-500 ring-iron-800" },
  rejected: { label: "Fix needed", chip: "bg-blood-500 text-white ring-blood-500" },
};

function StateIcon({ s }: { s: StepState }) {
  const c = "h-6 w-6 shrink-0";
  if (s === "done") return <CheckCircle2 className={`${c} text-volt-400`} />;
  if (s === "review") return <Clock className={`${c} text-iron-300`} />;
  if (s === "rejected") return <XCircle className={`${c} text-blood-400`} />;
  if (s === "locked") return <Lock className={`${c} text-iron-600`} />;
  return <Circle className={`${c} text-volt-400`} />;
}

function Step({
  n,
  title,
  desc,
  state,
  href,
  cta,
}: {
  n: number;
  title: string;
  desc: string;
  state: StepState;
  href?: string;
  cta?: string;
}) {
  const st = STATE_STYLE[state];
  return (
    <li className={`panel flex flex-wrap items-center gap-4 p-4 sm:p-5 ${state === "locked" ? "opacity-60" : ""}`}>
      <StateIcon s={state} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-display text-2xl font-extrabold uppercase leading-none">
            {n}. {title}
          </span>
          <span className={`chip ${st.chip}`}>{st.label}</span>
        </p>
        <p className="mt-1 text-sm text-iron-400">{desc}</p>
      </div>
      {href && state !== "locked" && (
        <Link href={href} className={state === "done" ? "btn-ghost !py-2 text-sm" : "btn-volt !py-2 text-sm"}>
          {cta} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </li>
  );
}

export function CompeteHub() {
  const ready = useIsClient();
  const { profile, entry } = useAccount();
  if (!ready || !profile) return null; // RequireProfile handles the gate

  const w = entry?.weighIn;
  const p = entry?.payment;
  const used = entry ? LIFTS.reduce((s, l) => s + entry.attempts[l].length, 0) : 0;
  const bests = entry ? LIFTS.map((l) => bestGood(entry, l)) : [0, 0, 0];
  const complete = bests.every((b) => b > 0);

  const reviewState = (s?: "pending" | "approved" | "rejected"): StepState =>
    !s ? "todo" : s === "approved" ? "done" : s === "rejected" ? "rejected" : "review";

  return (
    <ol className="space-y-3">
      <Step
        n={1}
        title="Category"
        desc={
          entry
            ? `${profile.sex === "M" ? "Men" : "Women"} ${classLabel(entry.weightClass)} · ${experienceLabel(entry.experience)}`
            : "Choose your experience level and IPF weight class."
        }
        state={entry ? "done" : "todo"}
        href="/compete/register"
        cta={entry ? "Edit" : "Choose"}
      />
      <Step
        n={2}
        title="Weigh-in"
        desc={
          w
            ? w.status === "rejected"
              ? `Rejected${w.note ? `: ${w.note}` : ""}. Submit it again.`
              : `${w.measuredKg} kg · ${w.status === "approved" ? "approved" : "waiting for a moderator"}`
            : "Live photo on a digital scale with today's code and the time."
        }
        state={!entry ? "locked" : reviewState(w?.status)}
        href="/compete/weigh-in"
        cta={w ? "View" : "Start"}
      />
      <Step
        n={3}
        title="Entry fee"
        desc={
          !feeRequired()
            ? "This meet is free to enter."
            : p
              ? p.status === "rejected"
                ? `Rejected${p.note ? `: ${p.note}` : ""}. Pay again.`
                : `${paymentLabel(p)} · ${p.status === "approved" ? "confirmed" : "waiting for confirmation"}`
              : `Pay ৳${MEET.entryFeeBdt} online (bKash, Nagad, Rocket, card or bank). Confirmed instantly.`
        }
        state={!entry ? "locked" : !feeRequired() ? "done" : reviewState(p?.status)}
        href="/compete/payment"
        cta={p ? "View" : "Pay now"}
      />
      <Step
        n={4}
        title="Lift: 3 attempts each"
        desc={
          entry && canLift(entry)
            ? `${used} of 9 attempts used · best Good Lifts: ${bests.map((b) => (b > 0 ? b : "–")).join(" / ")} kg`
            : "Unlocks after your weigh-in and entry fee are submitted."
        }
        state={!entry || !canLift(entry) ? "locked" : complete ? "done" : "todo"}
        href="/compete/attempts"
        cta="Open"
      />
      <Step
        n={5}
        title="Results"
        desc={
          complete
            ? isOfficial(entry!)
              ? "Official results. Share them with your Flex Card."
              : "Provisional until weigh-in and fee are approved. Your Flex Card is ready."
            : "Land a Good Lift on all three to unlock your Flex Card."
        }
        state={complete ? "done" : MEET.demoSkips ? "todo" : "locked"}
        href="/flex"
        cta="Flex Card"
      />

      {MEET.demoSkips && entry && !complete && (
        <li className="rounded-xl bg-amber-300/10 p-4 ring-1 ring-amber-300/40">
          <p className="mb-2 text-xs text-amber-100">
            Demo version: fill in Good Lifts for all three lifts to try the results and the Flex Card.
          </p>
          <button
            type="button"
            className="btn-ghost !py-2 text-sm"
            onClick={() => saveEntry(demoFillResults(entry, profile!.sex))}
          >
            Fill demo results (demo only)
          </button>
        </li>
      )}

      {complete && (
        <li className="flex flex-wrap gap-3 pt-2">
          <Link href="/flex" className="btn-volt">
            <Share2 className="h-5 w-5" /> My Flex Card
          </Link>
          <Link href="/#leaderboard" className="btn-ghost">
            See the board
          </Link>
        </li>
      )}
    </ol>
  );
}
