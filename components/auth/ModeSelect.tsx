"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Crown, Eye, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useAccount, useIsClient } from "@/lib/account";
import { setMode } from "@/lib/mode";
import { GUEST_PERKS, PRO_PERKS } from "@/lib/plans";
import { ProBadge } from "@/components/account/ProBadge";

/** The two-option screen every user sees right after logging in. */
export function ModeSelect() {
  const ready = useIsClient();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  const { ready: authReady, user, cloud, isPro } = useAuth();
  const { profile } = useAccount();

  if (!ready || !authReady) return <div className="panel h-96 animate-pulse-glow" aria-hidden />;
  if (!user) {
    return (
      <div className="panel p-8 text-center">
        <Link href="/login" className="btn-volt">Log in</Link>
      </div>
    );
  }

  const first = (profile?.name || cloud?.name || user.email?.split("@")[0] || "lifter").split(" ")[0];

  function compete() {
    setMode("compete");
    router.push(isPro ? (safeNext ?? "/compete") : "/subscribe");
  }
  function guest() {
    setMode("guest");
    router.push(safeNext && !safeNext.startsWith("/compete") ? safeNext : "/#leaderboard");
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="break-words font-display text-4xl font-black uppercase leading-none min-[400px]:text-5xl sm:text-6xl">
          Welcome, <span className="text-volt-400">{first}</span>
        </h1>
        {isPro && <ProBadge />}
      </div>
      {cloud && !(cloud.age && cloud.district) && (
        <p className="rounded-xl bg-iron-900 p-4 text-sm text-iron-200 ring-1 ring-iron-700">
          Your profile is missing details (district, age, bodyweight). <Link href="/join" className="font-semibold text-volt-400 underline">Complete it now</Link> so it&apos;s saved to your account.
        </p>
      )}
      <p className="max-w-xl text-iron-300">How do you want to use IronLeague BD?</p>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="panel flex flex-col gap-4 p-6 ring-1 ring-amber-300/40">
          <Trophy className="h-8 w-8 text-amber-300" />
          <h2 className="font-display text-3xl font-black uppercase leading-none">
            {isPro ? "Continue & compete" : "Subscribe & compete"}
          </h2>
          <p className="text-xs font-bold uppercase tracking-stencil text-amber-200">Full access</p>
          <ul className="flex-1 list-disc space-y-1.5 pl-5 text-sm text-iron-300">
            {PRO_PERKS.map((p) => <li key={p}>{p}</li>)}
          </ul>
          <button type="button" onClick={compete} className="btn-volt justify-center">
            <Crown className="h-4 w-4" /> {isPro ? "Go to my meet" : "Subscribe & compete"}
          </button>
        </section>

        <section className="panel flex flex-col gap-4 p-6">
          <Eye className="h-8 w-8 text-iron-300" />
          <h2 className="font-display text-3xl font-black uppercase leading-none">View as guest</h2>
          <p className="text-xs font-bold uppercase tracking-stencil text-iron-500">Free · read-only</p>
          <ul className="flex-1 list-disc space-y-1.5 pl-5 text-sm text-iron-300">
            {GUEST_PERKS.map((p) => <li key={p}>{p}</li>)}
            <li className="text-iron-500">Can&apos;t join meets or submit video attempts</li>
          </ul>
          <button type="button" onClick={guest} className="btn-ghost justify-center">
            Explore as guest
          </button>
        </section>
      </div>
    </div>
  );
}
