"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { supabase } from "./supabase/client";
import { useAuth } from "./auth";
import type { Lift } from "./types";
import { LIFTERS } from "./data";

/**
 * Follow, like a lift video, and message another lifter.
 *
 *  - Real accounts (their id is a UUID) are stored in Supabase: tables `follows`,
 *    `video_likes`, `messages` (see supabase/setup.sql). Row Level Security makes sure you
 *    can only act as yourself and only read your own conversations.
 *  - Demo lifters on the leaderboard are fictional, so there is no one to follow or to
 *    answer. Your actions on them are kept on this device only.
 */

const KEY = "ironleague:social:v1";
const MAX_MESSAGE = 500;

export const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export interface Msg {
  id: string;
  /** "me" = sent by you. */
  from: "me" | "them";
  body: string;
  at: string;
}

interface Local {
  following: string[];
  /** "<lifterId>:<lift>" */
  likes: string[];
  threads: Record<string, Msg[]>;
  names: Record<string, string>;
}

const EMPTY: Local = { following: [], likes: [], threads: {}, names: {} };
let cache: Local | null = null;
const listeners = new Set<() => void>();

function read(): Local {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Local>) } : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: Local) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked or full: still works for this visit */
  }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
};

function useLocal(): Local {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Called on log out so the next person on this device starts clean. */
export function clearSocial() {
  cache = EMPTY;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const mid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());

export interface SocialApi {
  /** True when this lifter is a real account (saved in the cloud). */
  cloud: boolean;
  loading: boolean;
  following: boolean;
  followers: number;
  /** How many lifters this lifter follows. */
  followingCount: number;
  liked: (lift: Lift) => boolean;
  likeCount: (lift: Lift) => number;
  messages: Msg[];
  error: string;
  toggleFollow: () => Promise<void>;
  toggleLike: (lift: Lift) => Promise<void>;
  send: (body: string) => Promise<string | null>;
}

/** Everything the profile page needs for ONE lifter. `name` is only used for the inbox. */
export function useSocial(targetId: string, name: string): SocialApi {
  const { user, configured } = useAuth();
  const me = user?.id ?? null;
  const real = isUuid(targetId); // a real account (else one of the demo lifters)
  // Follows and likes are shared through Supabase for real AND demo lifters, so counts add up
  // across accounts and devices. Chat messages only go to real accounts.
  const db = configured && !!me && targetId !== me && targetId !== "me"; // "me" = your own page
  const chat = db && real;
  const local = useLocal();

  const [loading, setLoading] = useState(db);
  const [error, setError] = useState("");
  const [cFollowing, setCFollowing] = useState(false);
  const [cFollowers, setCFollowers] = useState(0);
  const [cFollowingCount, setCFollowingCount] = useState(0);
  const [cLikes, setCLikes] = useState<{ user_id: string; lift: string }[]>([]);
  const [cMsgs, setCMsgs] = useState<Msg[]>([]);

  const FOLLOWS = real ? "follows" : "demo_follows";
  const LIKES = real ? "video_likes" : "demo_likes";
  const WHO = real ? "follower_id" : "user_id"; // the person who follows
  const TARGET = real ? "followee_id" : "lifter_id";
  const LIKE_TARGET = real ? "owner_id" : "lifter_id";

  const load = useCallback(async () => {
    if (!db || !me) return;
    const sb = supabase();
    const [f, l] = await Promise.all([
      sb.from(FOLLOWS).select(WHO).eq(TARGET, targetId),
      sb.from(LIKES).select("user_id, lift").eq(LIKE_TARGET, targetId),
    ]);
    if (f.error || l.error) {
      setError("Couldn't load. Did you run the newest supabase/setup.sql?");
      setLoading(false);
      return;
    }
    setError("");
    const rows = (f.data ?? []) as unknown as Record<string, string>[];
    setCFollowers(rows.length);
    setCFollowing(rows.some((r) => r[WHO] === me));
    setCLikes((l.data ?? []) as { user_id: string; lift: string }[]);
    if (real) {
      const [fc, m] = await Promise.all([
        sb.from("follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", targetId),
        sb
          .from("messages")
          .select("id, sender_id, body, created_at")
          .or(`and(sender_id.eq.${me},recipient_id.eq.${targetId}),and(sender_id.eq.${targetId},recipient_id.eq.${me})`)
          .order("created_at", { ascending: true })
          .limit(200),
      ]);
      setCFollowingCount(fc.count ?? 0);
      if (!m.error && m.data) {
        setCMsgs(
          m.data.map((r) => ({
            id: r.id as string,
            from: r.sender_id === me ? "me" : "them",
            body: r.body as string,
            at: r.created_at as string,
          })),
        );
      }
    }
    setLoading(false);
  }, [db, me, real, targetId, FOLLOWS, LIKES, WHO, TARGET, LIKE_TARGET]);

  useEffect(() => {
    void load();
    if (!db) return;
    const t = setInterval(() => void load(), 15000); // pick up new replies and counts
    return () => clearInterval(t);
  }, [load, db]);

  const toggleFollow = useCallback(async () => {
    if (!db || !me) {
      write({ ...read(), following: toggle(read().following, targetId), names: { ...read().names, [targetId]: name } });
      return;
    }
    const was = cFollowing;
    setCFollowing(!was);
    setCFollowers((n) => n + (was ? -1 : 1));
    const sb = supabase();
    const { error: e } = was
      ? await sb.from(FOLLOWS).delete().eq(WHO, me).eq(TARGET, targetId)
      : await sb.from(FOLLOWS).insert({ [WHO]: me, [TARGET]: targetId });
    if (e) {
      setCFollowing(was);
      setCFollowers((n) => n + (was ? 1 : -1));
      setError("Couldn't update follow. Try again.");
    } else {
      void load();
    }
  }, [db, me, targetId, name, cFollowing, FOLLOWS, WHO, TARGET, load]);

  const toggleLike = useCallback(
    async (lift: Lift) => {
      if (!db || !me) {
        write({ ...read(), likes: toggle(read().likes, `${targetId}:${lift}`) });
        return;
      }
      const was = cLikes.some((r) => r.user_id === me && r.lift === lift);
      setCLikes((rows) => (was ? rows.filter((r) => !(r.user_id === me && r.lift === lift)) : [...rows, { user_id: me, lift }]));
      const sb = supabase();
      const { error: e } = was
        ? await sb.from(LIKES).delete().eq("user_id", me).eq(LIKE_TARGET, targetId).eq("lift", lift)
        : await sb.from(LIKES).insert({ user_id: me, [LIKE_TARGET]: targetId, lift });
      if (e) {
        void load();
        setError("Couldn't update like. Try again.");
      }
    },
    [db, me, targetId, cLikes, load, LIKES, LIKE_TARGET],
  );

  const send = useCallback(
    async (raw: string) => {
      const body = raw.trim();
      if (!body) return "Write a message first.";
      if (body.length > MAX_MESSAGE) return `Keep it under ${MAX_MESSAGE} characters.`;
      if (!chat || !me) {
        const cur = read();
        const msg: Msg = { id: mid(), from: "me", body, at: new Date().toISOString() };
        write({
          ...cur,
          threads: { ...cur.threads, [targetId]: [...(cur.threads[targetId] ?? []), msg] },
          names: { ...cur.names, [targetId]: name },
        });
        return null;
      }
      const { data, error: e } = await supabase()
        .from("messages")
        .insert({ sender_id: me, recipient_id: targetId, body })
        .select("id, created_at")
        .single();
      if (e) return "Couldn't send. Check your connection and try again.";
      setCMsgs((m) => [...m, { id: data.id as string, from: "me", body, at: data.created_at as string }]);
      return null;
    },
    [chat, me, targetId, name],
  );

  return useMemo<SocialApi>(() => {
    if (db) {
      return {
        cloud: chat,
        loading,
        following: cFollowing,
        followers: cFollowers,
        followingCount: cFollowingCount,
        liked: (lift) => cLikes.some((r) => r.user_id === me && r.lift === lift),
        likeCount: (lift) => cLikes.filter((r) => r.lift === lift).length,
        messages: chat ? cMsgs : (local.threads[targetId] ?? []),
        error,
        toggleFollow,
        toggleLike,
        send,
      };
    }
    const f = local.following.includes(targetId);
    return {
      cloud: false,
      loading: false,
      following: f,
      followers: f ? 1 : 0,
      followingCount: 0,
      liked: (lift) => local.likes.includes(`${targetId}:${lift}`),
      likeCount: (lift) => (local.likes.includes(`${targetId}:${lift}`) ? 1 : 0),
      messages: local.threads[targetId] ?? [],
      error: "",
      toggleFollow,
      toggleLike,
      send,
    };
  }, [db, chat, loading, cFollowing, cFollowers, cFollowingCount, cLikes, cMsgs, me, error, local, targetId, toggleFollow, toggleLike, send]);
}

/* ---------------- inbox ---------------- */

export interface Thread {
  id: string;
  name: string;
  last: Msg;
  /** Unread messages from them (cloud only). */
  unread: number;
  cloud: boolean;
}

export function useInbox(): { threads: Thread[]; loading: boolean } {
  const { user, configured } = useAuth();
  const me = user?.id ?? null;
  const local = useLocal();
  const [cloudThreads, setCloudThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(configured && !!me);

  useEffect(() => {
    if (!configured || !me) return;
    let alive = true;
    const run = async () => {
      const sb = supabase();
      const { data, error } = await sb
        .from("messages")
        .select("id, sender_id, recipient_id, body, created_at, read_at")
        .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
        .order("created_at", { ascending: false })
        .limit(300);
      if (!alive) return;
      if (error || !data) return setLoading(false);
      const byOther = new Map<string, Thread>();
      for (const r of data) {
        const other = (r.sender_id === me ? r.recipient_id : r.sender_id) as string;
        const msg: Msg = { id: r.id, from: r.sender_id === me ? "me" : "them", body: r.body, at: r.created_at };
        const t = byOther.get(other) ?? { id: other, name: "", last: msg, unread: 0, cloud: true };
        if (msg.from === "them" && !r.read_at) t.unread += 1;
        byOther.set(other, t);
      }
      const ids = [...byOther.keys()];
      if (ids.length) {
        const { data: people } = await sb.from("public_profiles").select("id, name").in("id", ids);
        people?.forEach((p) => {
          const t = byOther.get(p.id as string);
          if (t) t.name = (p.name as string) || "Lifter";
        });
      }
      if (!alive) return;
      setCloudThreads([...byOther.values()].map((t) => ({ ...t, name: t.name || "Lifter" })));
      setLoading(false);
    };
    void run();
    const t = setInterval(() => void run(), 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [configured, me]);

  const threads = useMemo(() => {
    const localThreads: Thread[] = Object.entries(local.threads)
      .filter(([, m]) => m.length)
      .map(([id, m]) => ({ id, name: local.names[id] ?? "Lifter", last: m[m.length - 1]!, unread: 0, cloud: false }));
    return [...cloudThreads, ...localThreads].sort((a, b) => b.last.at.localeCompare(a.last.at));
  }, [cloudThreads, local]);

  return { threads, loading };
}

/** Marks messages from `otherId` as read (cloud only). Safe to call repeatedly. */
export async function markRead(meId: string, otherId: string) {
  if (!isUuid(otherId)) return;
  try {
    await supabase()
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", meId)
      .eq("sender_id", otherId)
      .is("read_at", null);
    window.dispatchEvent(new Event("ironleague:unread"));
  } catch {
    /* not critical */
  }
}

/* ---------------- people: search, followers / following, unread badge ---------------- */

export interface Person {
  id: string;
  name: string;
  homeGym: string;
  district: string;
  isPro?: boolean;
  /** Real account (saved in the cloud) rather than a demo lifter. */
  cloud: boolean;
}

type ProfileRow = { id: string; name: string | null; home_gym: string | null; district: string | null; is_pro: boolean | null };
const COLS = "id, name, home_gym, district, is_pro";
const toPerson = (r: ProfileRow): Person => ({
  id: r.id,
  name: r.name || "Lifter",
  homeGym: r.home_gym ?? "",
  district: r.district ?? "",
  isPro: Boolean(r.is_pro),
  cloud: true,
});

/** Real members whose name, gym or district contains `q`. Needs a signed-in user. */
export async function searchPeople(q: string, meId: string | null): Promise<Person[]> {
  const t = q.replace(/[^\p{L}\p{N} .'\-]/gu, " ").trim().slice(0, 40);
  if (t.length < 2) return [];
  try {
    const { data } = await supabase()
      .from("public_profiles")
      .select(COLS)
      .or(`name.ilike.%${t}%,home_gym.ilike.%${t}%,district.ilike.%${t}%`)
      .limit(20);
    return ((data ?? []) as ProfileRow[]).filter((r) => r.id !== meId).map(toPerson);
  } catch {
    return [];
  }
}

export async function fetchPeopleByIds(ids: string[]): Promise<Person[]> {
  const real = ids.filter(isUuid);
  if (!real.length) return [];
  try {
    const { data } = await supabase().from("public_profiles").select(COLS).in("id", real);
    return ((data ?? []) as ProfileRow[]).map(toPerson);
  } catch {
    return [];
  }
}

/** Number of unread messages for the little badge on the Messages tab. */
export function useUnreadCount(): number {
  const { user, configured } = useAuth();
  const me = user?.id ?? null;
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!configured || !me) {
      setN(0);
      return;
    }
    let alive = true;
    const run = async () => {
      try {
        const { count } = await supabase()
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", me)
          .is("read_at", null);
        if (alive) setN(count ?? 0);
      } catch {
        /* offline: keep the old number */
      }
    };
    void run();
    const t = setInterval(() => void run(), 30000);
    window.addEventListener("ironleague:unread", run);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("ironleague:unread", run);
    };
  }, [configured, me]);
  return n;
}

export interface NetworkApi {
  followers: Person[];
  following: Person[];
  loading: boolean;
  isFollowing: (id: string) => boolean;
  /** Follow or unfollow. `name` is remembered for demo lifters (device only). */
  toggle: (p: Pick<Person, "id" | "name">) => Promise<void>;
}

/** Who follows you and who you follow (real accounts from Supabase, demo lifters from this device). */
export function useNetwork(): NetworkApi {
  const { user, configured } = useAuth();
  const me = user?.id ?? null;
  const local = useLocal();
  const [followers, setFollowers] = useState<Person[]>([]);
  const [cloudFollowing, setCloudFollowing] = useState<Person[]>([]);
  const [demoIds, setDemoIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(configured && !!me);

  const load = useCallback(async () => {
    if (!configured || !me) return setLoading(false);
    try {
      const sb = supabase();
      const [a, b, d] = await Promise.all([
        sb.from("follows").select("follower_id").eq("followee_id", me),
        sb.from("follows").select("followee_id").eq("follower_id", me),
        sb.from("demo_follows").select("lifter_id").eq("user_id", me),
      ]);
      setDemoIds((d.data ?? []).map((r) => r.lifter_id as string));
      const fIds = (a.data ?? []).map((r) => r.follower_id as string);
      const gIds = (b.data ?? []).map((r) => r.followee_id as string);
      const people = await fetchPeopleByIds([...new Set([...fIds, ...gIds])]);
      const by = new Map(people.map((p) => [p.id, p]));
      setFollowers(fIds.map((id) => by.get(id)).filter((p): p is Person => !!p));
      setCloudFollowing(gIds.map((id) => by.get(id)).filter((p): p is Person => !!p));
    } finally {
      setLoading(false);
    }
  }, [configured, me]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = useCallback(
    async (p: Pick<Person, "id" | "name">) => {
      if (me && configured) {
        const sb = supabase();
        if (isUuid(p.id)) {
          const was = cloudFollowing.some((x) => x.id === p.id);
          if (was) {
            setCloudFollowing((l) => l.filter((x) => x.id !== p.id));
            await sb.from("follows").delete().eq("follower_id", me).eq("followee_id", p.id);
          } else {
            await sb.from("follows").insert({ follower_id: me, followee_id: p.id });
          }
        } else {
          const was = demoIds.includes(p.id);
          setDemoIds((l) => (was ? l.filter((x) => x !== p.id) : [...l, p.id]));
          if (was) await sb.from("demo_follows").delete().eq("user_id", me).eq("lifter_id", p.id);
          else await sb.from("demo_follows").insert({ user_id: me, lifter_id: p.id });
        }
        await load();
        return;
      }
      const cur = read();
      write({ ...cur, following: toggle2(cur.following, p.id), names: { ...cur.names, [p.id]: p.name } });
    },
    [me, configured, cloudFollowing, demoIds, load],
  );

  const following = useMemo<Person[]>(() => {
    // Signed in: demo follows come from the database. Otherwise from this device.
    const ids = me && configured ? demoIds : local.following.filter((id) => !isUuid(id));
    const demo = ids.map((id) => {
      const d = DEMO_BY_ID.get(id);
      return { id, name: d?.name ?? local.names[id] ?? "Lifter", homeGym: d?.homeGym ?? "", district: d?.district ?? "", cloud: false };
    });
    return [...cloudFollowing, ...demo];
  }, [cloudFollowing, demoIds, local, me, configured]);

  const isFollowing = useCallback((id: string) => following.some((p) => p.id === id), [following]);

  return { followers, following, loading, isFollowing, toggle };
}

const toggle2 = toggle;
const DEMO_BY_ID = new Map(LIFTERS.map((l) => [l.id, l]));
