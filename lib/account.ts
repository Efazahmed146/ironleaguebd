import { useSyncExternalStore } from "react";
import type { Lifter, Sex } from "./types";
import { ageGroupFor } from "./categories";
import { collectVideoIds, entryLifts, isOfficial, LIFTS, type MeetEntry } from "./meet";
import { deleteVideo } from "./video-store";

/**
 * Device-local account store (MVP).
 *
 * The profile and competition entry live in this browser's localStorage so the
 * whole flow works without a backend. Replace the writers (saveProfile /
 * saveEntry / signOut) with Supabase calls when you connect it; components
 * only talk to this module.
 */

export interface Profile {
  name: string;
  email: string;
  sex: Sex;
  age: number;
  bodyweightKg: number;
  homeGym: string;
  district: string;
  /** Neighbourhood / thana, optional. */
  area?: string;
  /** Downsized JPEG data URL. */
  avatarDataUrl?: string;
  createdAt: string;
}

export interface Account {
  profile: Profile | null;
  entry: MeetEntry | null;
}

const KEY = "ironleague:account:v1";
const EMPTY: Account = { profile: null, entry: null };

let raw: string | null = null;
let parsed: Account = EMPTY;
const listeners = new Set<() => void>();

function parse(r: string | null): Account {
  if (!r) return EMPTY;
  try {
    const v = JSON.parse(r) as Partial<Account>;
    return { profile: v.profile ?? null, entry: v.entry ?? null };
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): Account {
  let r: string | null = null;
  try {
    r = localStorage.getItem(KEY);
  } catch {
    /* storage blocked */
  }
  if (r !== raw) {
    raw = r;
    parsed = parse(r);
  }
  return parsed;
}

const getServerSnapshot = (): Account => EMPTY;

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: Account): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return false; // quota exceeded or storage blocked
  }
  listeners.forEach((l) => l());
  return true;
}

/** Current account; reactive across tabs and components. */
export function useAccount(): Account {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Non-reactive read (for event handlers). */
export const getAccount = getSnapshot;

const noopSubscribe = () => () => {};
/** False during SSR/hydration, true afterwards — avoids hydration mismatches. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function saveProfile(profile: Profile): boolean {
  return write({ ...getSnapshot(), profile });
}

export function saveEntry(entry: MeetEntry | null): boolean {
  return write({ ...getSnapshot(), entry });
}

export function signOut() {
  collectVideoIds(getSnapshot().entry).forEach((id) => {
    deleteVideo(id).catch(() => {});
    deleteVideo(`frames:${id}`).catch(() => {});
  });
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Profile has everything the competition needs (older saves may not). */
export const isProfileComplete = (p: Profile | null): p is Profile =>
  Boolean(p && p.age && p.district && p.homeGym);

/** Turns the local account into a leaderboard entry (or null if not joined). */
export function accountToLifter(a: Account, isPro = false): Lifter | null {
  if (!a.profile) return null;
  const { profile: p, entry: e } = a;
  const lifts = e ? entryLifts(e) : { squatKg: 0, benchKg: 0, deadliftKg: 0 };

  const judged = e
    ? LIFTS.flatMap((l) => e.attempts[l]).filter((x) => x.status === "good" || x.status === "no_lift")
    : [];
  const latest = judged.map((x) => x.reviewedAt ?? "").sort().pop();

  return {
    id: "me",
    name: p.name,
    sex: p.sex,
    age: p.age,
    bodyweightKg: e?.weighIn?.status === "approved" ? e.weighIn.measuredKg : p.bodyweightKg,
    homeGym: p.homeGym,
    district: p.district ?? "",
    area: p.area,
    experience: e?.experience,
    weightClass: e?.weightClass,
    ageGroup: ageGroupFor(p.age) ?? undefined,
    ...lifts,
    proofOnFile: judged.some((x) => x.videoId),
    verified: e ? isOfficial(e) : false,
    updatedAt: latest || e?.registeredAt || p.createdAt,
    avatarUrl: p.avatarDataUrl,
    isYou: true,
    isPro,
  };
}
