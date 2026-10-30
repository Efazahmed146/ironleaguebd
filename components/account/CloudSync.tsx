"use client";

import { useEffect, useRef, useState } from "react";
import { accountToLifter, getAccount, isProfileComplete, saveEntry, saveProfile, signOut as clearLocal, useAccount } from "@/lib/account";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import type { MeetEntry } from "@/lib/meet";
import { syncPaidEntryFee } from "@/lib/payments/client";

const UID_KEY = "ironleague:uid";

/**
 * Keeps this device's profile and competition history in sync with Supabase.
 *  - After login: pulls your cloud profile + history (cloud wins when it has data).
 *  - After edits: pushes the profile (everyone) and the history (Pro only; the database enforces it).
 * Renders nothing.
 */
export function CloudSync() {
  const { user, isPro, cloud, refresh } = useAuth();
  const { profile, entry } = useAccount();
  const hydrated = useRef<string | null>(null);
  const [hydratedId, setHydratedId] = useState<string | null>(null);
  const sent = useRef({ p: "", s: "" });
  const userId = user?.id;

  // ---- pull once per login ----
  useEffect(() => {
    if (!userId) {
      hydrated.current = null;
      setHydratedId(null);
      return;
    }
    if (hydrated.current === userId) return;
    let cancelled = false;

    (async () => {
      try {
        const prev = localStorage.getItem(UID_KEY);
        if (prev && prev !== userId) clearLocal(); // another account used this browser before
        localStorage.setItem(UID_KEY, userId);
      } catch {
        /* storage blocked */
      }

      const sb = supabase();
      const [p, s] = await Promise.all([
        sb.from("users").select("*").eq("id", userId).maybeSingle(),
        sb.from("lifter_state").select("entry,avatar").eq("user_id", userId).maybeSingle(),
      ]);
      if (cancelled) return;

      const row = p.data;
      const local = getAccount();
      if (row && row.age && row.district && row.sex) {
        saveProfile({
          name: row.name,
          email: user?.email ?? "",
          sex: row.sex,
          age: row.age,
          bodyweightKg: Number(row.bodyweight_kg ?? local.profile?.bodyweightKg ?? 0),
          homeGym: row.home_gym ?? "",
          district: row.district,
          area: row.area ?? undefined,
          avatarDataUrl: s.data?.avatar ?? local.profile?.avatarDataUrl,
          createdAt: row.created_at,
        });
      }
      if (s.data?.entry) saveEntry(s.data.entry as MeetEntry);
      hydrated.current = userId;
      setHydratedId(userId);
    })().catch((e) => {
      console.warn("[IronLeague] cloud pull failed (offline?):", e);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, user?.email]);

  // ---- entry fee paid online? (confirmed by the server) ----
  const hasEntry = Boolean(entry);
  useEffect(() => {
    if (hydratedId && hasEntry) void syncPaidEntryFee();
  }, [hydratedId, hasEntry]);

  // ---- publish your best lifts so EVERY device's leaderboard shows you ----
  const sentResults = useRef("");
  useEffect(() => {
    if (!userId || hydratedId !== userId) return;
    const me = accountToLifter(getAccount(), isPro);
    if (!me) return;
    const total = me.squatKg + me.benchKg + me.deadliftKg;
    if (total <= 0 && !sentResults.current) return;
    const row = {
      user_id: userId,
      squat_kg: me.squatKg,
      bench_kg: me.benchKg,
      deadlift_kg: me.deadliftKg,
      bodyweight_kg: me.bodyweightKg >= 25 && me.bodyweightKg <= 300 ? me.bodyweightKg : null,
      has_proof: Boolean(me.proofOnFile),
    };
    const key = JSON.stringify(row);
    if (key === sentResults.current) return;
    const t = setTimeout(async () => {
      const { error } = await supabase()
        .from("results")
        .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) console.warn("[IronLeague] couldn't publish results (run the newest setup.sql?):", error.message);
      else sentResults.current = key;
    }, 1500);
    return () => clearTimeout(t);
  }, [userId, hydratedId, profile, entry, isPro]);

  // ---- push (debounced) ----
  useEffect(() => {
    if (!userId || hydratedId !== userId) return;
    const t = setTimeout(async () => {
      const sb = supabase();

      if (profile && isProfileComplete(profile)) {
        const row = {
          id: userId,
          email: user?.email ?? null,
          name: profile.name,
          sex: profile.sex,
          age: profile.age,
          bodyweight_kg: profile.bodyweightKg,
          district: profile.district,
          area: profile.area ?? null,
          home_gym: profile.homeGym,
          experience: entry?.experience ?? null,
          weight_class: entry?.weightClass ?? null,
        };
        const key = JSON.stringify(row);
        if (key !== sent.current.p) {
          const { error } = await sb.from("users").upsert(row);
          if (error) console.warn("[IronLeague] saving profile to public.users failed:", error.message);
          else sent.current.p = key;
        }
      }

      // History (entry, attempts, DOTS, AI results, video ids) is a Pro feature.
      if (isPro && (entry || profile?.avatarDataUrl)) {
        const doc = { user_id: userId, entry: entry ?? null, avatar: profile?.avatarDataUrl ?? null };
        const key = JSON.stringify(doc);
        if (key !== sent.current.s) {
          const { error } = await sb.from("lifter_state").upsert({ ...doc, updated_at: new Date().toISOString() });
          if (error) console.warn("[IronLeague] saving history failed:", error.message);
          else sent.current.s = key;
        }
      }
      // pick up a changed experience / weight class on the cloud copy
      if (cloud && entry && (cloud.experience !== entry.experience || cloud.weight_class !== entry.weightClass)) {
        void refresh();
      }
    }, 800);
    return () => clearTimeout(t);
  }, [userId, hydratedId, user?.email, profile, entry, isPro, cloud, refresh]);

  return null;
}
