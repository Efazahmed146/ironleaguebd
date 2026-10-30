"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, MessageCircle, UserCheck, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useIsClient } from "@/lib/account";
import { useNetwork, type Person } from "@/lib/social";
import { PersonAvatar } from "./PersonAvatar";

/** "12 followers · 5 following" for your own profile. Both open the lists. */
export function MyNetworkCounts() {
  const { followers, following, loading } = useNetwork();
  return (
    <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-iron-400">
      <Link href="/network?tab=followers" className="transition hover:text-volt-300">
        <b className="tabular-nums text-iron-100">{loading ? "–" : followers.length}</b> {followers.length === 1 ? "follower" : "followers"}
      </Link>
      <Link href="/network?tab=following" className="transition hover:text-volt-300">
        <b className="tabular-nums text-iron-100">{loading ? "–" : following.length}</b> following
      </Link>
    </p>
  );
}

type Tab = "followers" | "following";

function Row({ p, following, onToggle }: { p: Person; following: boolean; onToggle: () => void }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <PersonAvatar name={p.name} />
      <Link href={`/athlete/${p.id}`} className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-iron-50 hover:text-volt-300">{p.name}</span>
        {(p.homeGym || p.district) && (
          <span className="flex items-center gap-1 truncate text-xs text-iron-400">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{[p.homeGym, p.district].filter(Boolean).join(" · ")}</span>
          </span>
        )}
      </Link>
      <Link href={`/messages?with=${p.id}`} aria-label={`Message ${p.name}`} className="btn-ghost !p-2.5">
        <MessageCircle className="h-4 w-4" />
      </Link>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={following}
        className={`${following ? "btn-ghost" : "btn-volt"} !px-3 !py-2 text-xs`}
      >
        {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
        <span className="hidden min-[400px]:inline">{following ? "Following" : "Follow back"}</span>
      </button>
    </li>
  );
}

/** Your followers and the people you follow (like Instagram). */
export function Network({ demo }: { demo: Person[] }) {
  const ready = useIsClient();
  const { user } = useAuth();
  const { followers, following, loading, isFollowing, toggle } = useNetwork();
  const [tab, setTab] = useState<Tab>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "followers" ? "followers" : "following",
  );

  if (!ready || loading) return <div className="panel h-48 animate-pulse-glow" aria-busy="true" />;
  if (!user) return <div className="panel p-8 text-center"><Link href="/login" className="btn-volt">Log in</Link></div>;

  // Demo lifters you follow on this device get their gym / district filled in.
  const byId = new Map(demo.map((d) => [d.id, d]));
  const list = (tab === "followers" ? followers : following).map((p) => byId.get(p.id) ?? p);

  return (
    <div className="space-y-4">
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg bg-iron-950 p-1 ring-1 ring-iron-800">
        {(["following", "followers"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-md py-2 text-sm font-bold uppercase tracking-wider transition ${
              tab === t ? "bg-iron-700 text-iron-50" : "text-iron-400 hover:text-volt-300"
            }`}
          >
            {t === "following" ? `Following ${following.length}` : `Followers ${followers.length}`}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="panel p-8 text-center">
          <Users className="mx-auto h-9 w-9 text-volt-400" />
          <p className="mt-3 font-display text-3xl font-black uppercase">
            {tab === "following" ? "You're not following anyone yet" : "No followers yet"}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-iron-400">
            {tab === "following"
              ? "Open a lifter from the leaderboard and tap Follow."
              : "When other lifters follow you, they show up here."}
          </p>
          <Link href="/#leaderboard" className="btn-volt mt-5 inline-flex">Browse leaderboard</Link>
        </div>
      ) : (
        <ul className="panel divide-y divide-iron-800 overflow-hidden">
          {list.map((p) => (
            <Row key={p.id} p={p} following={isFollowing(p.id)} onToggle={() => void toggle(p)} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Quick links on your profile page: public profile, followers / following, messages. */
export function ProfileShortcuts() {
  const ready = useIsClient();
  const { user } = useAuth();
  const { followers, following, loading } = useNetwork();
  if (!ready || !user) return null;
  const items = [
    { href: "/athlete/me", label: "My page", value: "View" },
    { href: "/network?tab=followers", label: "Followers", value: loading ? "–" : String(followers.length) },
    { href: "/network?tab=following", label: "Following", value: loading ? "–" : String(following.length) },
    { href: "/messages", label: "Messages", value: "Open" },
  ];
  return (
    <nav aria-label="My network" className="mb-6 grid grid-cols-2 gap-2 min-[480px]:grid-cols-4">
      {items.map((i) => (
        <Link key={i.label} href={i.href} className="min-w-0 rounded-xl bg-iron-900 p-3 text-center ring-1 ring-iron-800 transition hover:ring-volt-400/50">
          <span className="block font-display text-2xl font-black leading-none text-volt-400">{i.value}</span>
          <span className="mt-1 block truncate text-[11px] font-bold uppercase tracking-stencil text-iron-400">{i.label}</span>
        </Link>
      ))}
    </nav>
  );
}
