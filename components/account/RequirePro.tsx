"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Crown, LogIn } from "lucide-react";
import { useIsClient } from "@/lib/account";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { MEET } from "@/lib/meet";
import { activateDemoPro } from "@/lib/subscription-demo";
import { GUEST_PERKS, PRO_PERKS } from "@/lib/plans";

/**
 * Access control for competing: only active subscribers see `children`.
 * Guests get an upgrade prompt. (The database enforces the same rule with RLS,
 * so bypassing this component doesn't give anyone cloud access.)
 */
export function RequirePro({ children, feature }: { children: ReactNode; feature: string }) {
  const ready = useIsClient();
  const { ready: authReady, user, isPro, configured, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!ready || !authReady) return <div className="panel h-72 animate-pulse-glow" aria-hidden />;

  // Supabase not configured: local demo mode keeps working.
  if (!configured) return <>{children}</>;

  if (!user) {
    return (
      <div className="panel flex flex-col items-center gap-4 px-6 py-14 text-center">
        <LogIn className="h-10 w-10 text-volt-400" />
        <p className="font-display text-3xl font-black uppercase">Log in first</p>
        <p className="max-w-sm text-sm text-iron-400">You need an account to {feature}.</p>
        <Link href="/login" className="btn-volt">Log in / Join</Link>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="panel space-y-5 px-6 py-10 text-center">
        <Crown className="mx-auto h-10 w-10 text-amber-300" />
        <p className="font-display text-3xl font-black uppercase">Pro members only</p>
        <p className="mx-auto max-w-md text-sm text-iron-300">
          You&apos;re in <b>Guest mode</b> (read-only). Subscribe to {feature}.
        </p>
        <div className="mx-auto grid max-w-xl gap-3 text-left sm:grid-cols-2">
          <div className="rounded-xl bg-iron-950 p-4 ring-1 ring-iron-800">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-stencil text-iron-500">Guest (free)</p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-iron-400">
              {GUEST_PERKS.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
          <div className="rounded-xl bg-amber-300/5 p-4 ring-1 ring-amber-300/40">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-stencil text-amber-200">Pro</p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-iron-200">
              {PRO_PERKS.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/subscribe" className="btn-volt">Subscribe &amp; compete</Link>
          <Link href="/" className="btn-ghost">Back to leaderboard</Link>
        </div>
        {MEET.demoSkips && (
          <div>
            <button
              type="button"
              disabled={busy}
              className="text-sm font-semibold text-amber-200 underline"
              onClick={async () => {
                setBusy(true);
                setErr("");
                const e = await activateDemoPro();
                if (e) setErr(e);
                else await refresh();
                setBusy(false);
              }}
            >
              {busy ? "Activating…" : "Skip subscription (demo only)"}
            </button>
            {err && <p role="alert" className="mt-1 text-sm text-blood-400">{err}</p>}
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
