"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Crown, LogOut, MessageCircle, Settings, User as UserIcon, UserCog, Users } from "lucide-react";
import { useAccount, useIsClient } from "@/lib/account";
import { socialAvatar, useAuth } from "@/lib/auth";
import { setMode, useMode } from "@/lib/mode";
import { initials } from "@/lib/format";
import { ProBadge } from "./ProBadge";
import { UnreadBadge } from "@/components/athlete/UnreadBadge";

const ITEM = "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-iron-100 transition hover:bg-iron-850 hover:text-volt-300";

export function AccountButton() {
  const ready = useIsClient();
  const { profile } = useAccount();
  const { user, cloud, isPro, logout, configured } = useAuth();
  const mode = useMode();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // close when you navigate, tap outside, or press Escape
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!ready) return <div className="h-10 w-28" aria-hidden />;

  if (!user) {
    return (
      <Link prefetch href={configured ? "/login" : "/join"} className="btn-volt !px-4 !py-2 text-sm">
        <span className="hidden sm:inline">Log in / Join</span>
        <span className="sm:hidden">Log in</span>
      </Link>
    );
  }

  const photo = profile?.avatarDataUrl ?? socialAvatar(user);
  const name = profile?.name || cloud?.name || user.email?.split("@")[0] || "Lifter";

  async function onLogout() {
    setOpen(false);
    await logout();
    setMode(null);
    router.push("/");
  }

  return (
    <div ref={box} className="relative flex shrink-0 items-center gap-2">
      {!isPro && (
        <Link href="/subscribe" className="hidden rounded-full bg-amber-300/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-200 ring-1 ring-amber-300/50 hover:bg-amber-300/25 sm:inline-block">
          {mode === "guest" ? "Guest · Upgrade" : "Upgrade"}
        </Link>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex shrink-0 items-center gap-2 rounded-full bg-iron-900 py-1 pl-1 pr-2 ring-1 ring-iron-700 transition hover:ring-volt-400/60 sm:pr-3"
      >
        <span className="relative">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="grid h-8 w-8 place-items-center rounded-full bg-volt-400 font-display text-sm font-extrabold text-iron-950">
              {initials(name)}
            </span>
          )}
        </span>
        <span className="hidden max-w-[6rem] truncate text-sm font-semibold sm:inline">{name.split(" ")[0]}</span>
        {isPro && <ProBadge compact />}
        <ChevronDown className={`h-4 w-4 text-iron-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl bg-iron-900 shadow-2xl ring-1 ring-iron-700"
        >
          <div className="border-b border-iron-800 px-4 py-3">
            <p className="truncate font-display text-xl font-extrabold uppercase leading-tight">{name}</p>
            <p className="truncate text-xs text-iron-400">{user.email || cloud?.phone || ""}</p>
          </div>
          <Link role="menuitem" href="/athlete/me" className={ITEM}><UserIcon className="h-4 w-4 text-volt-400" /> My page</Link>
          <Link role="menuitem" href="/join" className={ITEM}><UserCog className="h-4 w-4 text-volt-400" /> Edit profile</Link>
          <Link role="menuitem" href="/network" className={ITEM}><Users className="h-4 w-4 text-volt-400" /> Followers &amp; following</Link>
          <Link role="menuitem" href="/messages" className={ITEM}>
            <span className="relative"><MessageCircle className="h-4 w-4 text-volt-400" /><UnreadBadge /></span> Messages
          </Link>
          <Link role="menuitem" href="/account" className={ITEM}><Settings className="h-4 w-4 text-volt-400" /> Account settings</Link>
          {!isPro && (
            <Link role="menuitem" href="/subscribe" className={ITEM}><Crown className="h-4 w-4 text-amber-300" /> Subscribe &amp; compete</Link>
          )}
          <button type="button" role="menuitem" onClick={onLogout} className={`${ITEM} border-t border-iron-800 !text-blood-400`}>
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
