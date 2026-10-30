"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import { useAuth } from "@/lib/auth";

/** Shown to signed-in guests: competing is Pro-only. */
export function UpgradeBanner() {
  const { ready, user, isPro, configured } = useAuth();
  if (!configured || !ready || !user || isPro) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-300/10 p-4 ring-1 ring-amber-300/40">
      <p className="flex items-center gap-2 text-sm text-iron-100">
        <Crown className="h-4 w-4 text-amber-300" />
        You&apos;re in Guest mode: you can look around, but joining and submitting lifts needs Pro.
      </p>
      <Link href="/subscribe" className="btn-volt !py-2 text-sm">Subscribe &amp; compete</Link>
    </div>
  );
}
