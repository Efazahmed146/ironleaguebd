"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { isProfileComplete, useAccount, useIsClient } from "@/lib/account";
import { useAuth } from "@/lib/auth";

/** Renders children only for lifters with a complete profile; otherwise a prompt. */
export function RequireProfile({
  children,
  reason,
}: {
  children: ReactNode;
  reason: string;
}) {
  const ready = useIsClient();
  const { profile } = useAccount();
  const { ready: authReady, user, cloud } = useAuth();
  // Details typed at sign-up are being copied from your account to this device: don't flash "create your profile".
  const syncing = Boolean(user && !isProfileComplete(profile) && cloud?.age && cloud?.district && cloud?.sex && cloud?.home_gym);

  if (!ready || !authReady || syncing) {
    return <div className="panel h-72 animate-pulse-glow" aria-hidden />;
  }

  if (!profile || !isProfileComplete(profile)) {
    return (
      <div className="panel flex flex-col items-center gap-4 px-6 py-14 text-center">
        <UserPlus className="h-10 w-10 text-volt-400" />
        <p className="font-display text-3xl font-black uppercase">
          {profile ? "Complete your profile" : "Join the league first"}
        </p>
        <p className="max-w-sm text-sm text-iron-400">
          {profile
            ? "We now need your age and district for the competition categories."
            : reason}
        </p>
        <Link href="/join" className="btn-volt">
          {profile ? "Update my profile" : "Create your profile"}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
