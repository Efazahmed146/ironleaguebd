"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserCog } from "lucide-react";
import { isProfileComplete, useAccount, useIsClient } from "@/lib/account";
import { useAuth } from "@/lib/auth";

/** Pages that need a finished profile. Home, leaderboard, rules, profile and account stay open. */
const NEEDS_PROFILE = ["/subscribe", "/compete", "/flex"];
/** Pages where the friendly reminder popup would just be in the way. */
const NO_REMINDER = ["/join", "/login", "/account", "/auth", "/reset-password"];

/** True once the user's details (age, district, home gym, gender) exist locally or in their account. */
export function useProfileComplete(): { known: boolean; complete: boolean } {
  const ready = useIsClient();
  const { profile } = useAccount();
  const { ready: authReady, user, cloud } = useAuth();
  if (!ready || !authReady || !user) return { known: false, complete: false };
  if (isProfileComplete(profile)) return { known: true, complete: true };
  if (!cloud) return { known: false, complete: false }; // account row still loading
  return { known: true, complete: Boolean(cloud.age && cloud.district && cloud.sex && cloud.home_gym) };
}

/**
 * People who signed in with Google / Facebook only have a name and photo. Until they fill in
 * their details, a popup stops them on every competition page and sends them to their profile.
 */
export function ProfileGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { known, complete } = useProfileComplete();
  const guarded = NEEDS_PROFILE.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const incomplete = known && !complete;
  const block = incomplete && guarded;

  // Right after login: a popup asks them to fill in their information. "Later" hides it for this visit.
  const key = user ? `ironleague:pg-later:${user.id}` : "";
  const [later, setLater] = useState(true); // true until we've read sessionStorage (no flash)
  useEffect(() => {
    if (!key) return;
    try {
      setLater(sessionStorage.getItem(key) === "1");
    } catch {
      setLater(false);
    }
  }, [key]);
  const reminder = incomplete && !guarded && !later && !NO_REMINDER.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const show = block || reminder;

  useEffect(() => {
    if (!block) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && router.push("/");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [block, router]);

  function dismiss() {
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    setLater(true);
  }

  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div role="alertdialog" aria-modal="true" aria-labelledby="pg-title" className="panel w-full max-w-md space-y-4 bg-iron-900 p-6 text-center">
        <UserCog className="mx-auto h-10 w-10 text-volt-400" />
        <h2 id="pg-title" className="font-display text-3xl font-black uppercase leading-none">Fill in your information</h2>
        <p className="text-sm text-iron-300">
          Add your age, gender, bodyweight, district and home gym. We need them to put you in the right category.
          {block
            ? " You can't continue to the competition or subscription until your profile is complete."
            : " You can't compete or subscribe until your profile is complete, so it's best to do it now."}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/join" onClick={() => !block && dismiss()} className="btn-volt justify-center">Fill my information</Link>
          {block ? (
            <Link href="/" className="btn-ghost justify-center">Not now</Link>
          ) : (
            <button type="button" onClick={dismiss} className="btn-ghost justify-center">Later</button>
          )}
        </div>
      </div>
    </div>
  );
}
