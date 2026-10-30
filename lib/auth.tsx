"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./supabase/client";

/** Row of public.users (see supabase/setup.sql). */
export interface CloudProfile {
  id: string;
  email: string | null;
  /** Mobile number in +8801XXXXXXXXX form. Private: only you and staff can read it. */
  phone: string | null;
  name: string;
  sex: "M" | "F" | null;
  age: number | null;
  bodyweight_kg: number | null;
  district: string | null;
  area: string | null;
  home_gym: string | null;
  experience: string | null;
  weight_class: string | null;
  role: "lifter" | "moderator" | "admin";
  is_subscribed: boolean;
  subscribed_until: string | null;
  created_at: string;
}

/** Paid and not expired. The database enforces the same rule (public.is_pro()). */
export const isProActive = (p: Pick<CloudProfile, "is_subscribed" | "subscribed_until"> | null | undefined) =>
  Boolean(p?.is_subscribed && (!p.subscribed_until || new Date(p.subscribed_until) > new Date()));

/** Profile picture from a Google / Facebook sign-in, if any. */
export function socialAvatar(user: User | null | undefined): string | null {
  const m = user?.user_metadata as { avatar_url?: string; picture?: string } | undefined;
  return m?.avatar_url ?? m?.picture ?? null;
}

export type OAuthProvider = "google" | "facebook";

/** What the register form collects. All of it is saved to public.users by the signup trigger. */
export interface SignUpDetails {
  name: string;
  /** Empty when signing up with a mobile number only. */
  email: string;
  /** +8801XXXXXXXXX (already normalized). Saved to public.users in both sign-up modes. */
  phone: string;
  password: string;
  /** Profile details are optional now: they are filled in after the first login. */
  district?: string;
  homeGym?: string;
  sex?: "M" | "F";
  age?: number;
  bodyweightKg?: number;
}

interface AuthState {
  /** False until the first session check finishes. */
  ready: boolean;
  configured: boolean;
  user: User | null;
  cloud: CloudProfile | null;
  isPro: boolean;
  isAdmin: boolean;
  refresh: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<string | null>;
  signInPhone: (phone: string, password: string) => Promise<string | null>;
  signUpEmail: (details: SignUpDetails) => Promise<{ error?: string; needsConfirm?: boolean }>;
  /** Sign up with the mobile number as the login id (no email needed). */
  signUpPhone: (details: SignUpDetails) => Promise<{ error?: string; needsConfirm?: boolean }>;
  signInOAuth: (provider: OAuthProvider, next?: string) => Promise<string | null>;
  requestPasswordReset: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  updateAccount: (changes: { name?: string; email?: string; phone?: string }) => Promise<{ error?: string; emailPending?: boolean }>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Wrong email/mobile number or password.";
  if (m.includes("phone") && (m.includes("provider") || m.includes("disabled") || m.includes("unsupported")))
    return "Mobile-number login isn't switched on yet. In Supabase: Authentication → Sign In / Providers → Phone → enable it and turn OFF \"Enable phone confirmations\".";
  if (m.includes("phone") && (m.includes("already") || m.includes("exists"))) return "That mobile number already has an account. Log in instead.";
  if (m.includes("email not confirmed")) return "Confirm your email first: check your inbox for the link.";
  if (m.includes("already registered") || m.includes("already been registered")) return "That email already has an account. Log in instead.";
  if (m.includes("password") && m.includes("least")) return "Password is too short (use at least 8 characters).";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Wait a minute and try again.";
  if (m.includes("fetch") || m.includes("network")) return "Can't reach the server. Check your internet.";
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supabaseConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [cloud, setCloud] = useState<CloudProfile | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const sb = supabase();
    // Keep the SAME user object while nothing changed, so pages don't re-render or flicker
    // every time Supabase re-checks the session (tab focus, token refresh).
    const adopt = (next: User | null) =>
      setUser((prev) => (prev && next && prev.id === next.id && prev.updated_at === next.updated_at ? prev : next));
    sb.auth.getSession().then(({ data }) => {
      adopt(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      // A refresh hiccup can report "no session" for a moment. Only a real sign-out logs you out here.
      if (!session && event !== "SIGNED_OUT" && event !== "INITIAL_SESSION") return;
      adopt(session?.user ?? null);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = user?.id;
  const refresh = useCallback(async () => {
    if (!supabaseConfigured || !userId) return setCloud(null);
    const sb = supabase();
    let { data } = await sb.from("users").select("*").eq("id", userId).maybeSingle();
    if (!data && user) {
      // Safety net if the database trigger hasn't created the row (e.g. setup.sql not run yet).
      await sb.from("users").upsert({
        id: user.id,
        email: user.email ?? null,
        phone: user.phone ? `+${user.phone.replace(/^\+/, "")}` : null,
        name: (user.user_metadata?.name as string | undefined) ?? (user.user_metadata?.full_name as string | undefined) ?? "",
      });
      ({ data } = await sb.from("users").select("*").eq("id", userId).maybeSingle());
    }
    setCloud((data as CloudProfile | null) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, user?.email, user?.phone]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // pick up an admin approval without a manual reload
  useEffect(() => {
    if (!userId) return;
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [userId, refresh]);

  const signInEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    return error ? friendly(error.message) : null;
  }, []);

  const signInPhone = useCallback(async (phone: string, password: string) => {
    const { error } = await supabase().auth.signInWithPassword({ phone, password });
    return error ? friendly(error.message) : null;
  }, []);

  const signUpEmail = useCallback(async (d: SignUpDetails) => {
    const { data, error } = await supabase().auth.signUp({
      email: d.email.trim().toLowerCase(),
      password: d.password,
      options: {
        data: {
          name: d.name.trim(),
          phone: d.phone,
          ...(d.district ? { district: d.district } : {}),
          ...(d.homeGym ? { home_gym: d.homeGym.trim() } : {}),
          ...(d.sex ? { sex: d.sex } : {}),
          ...(d.age ? { age: String(d.age) } : {}),
          ...(d.bodyweightKg ? { bodyweight_kg: String(d.bodyweightKg) } : {}),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) return { error: friendly(error.message) };
    // When email confirmation is on, no session is returned until the link is clicked.
    return { needsConfirm: !data.session };
  }, []);

  const signUpPhone = useCallback(async (d: SignUpDetails) => {
    const { data, error } = await supabase().auth.signUp({
      phone: d.phone,
      password: d.password,
      options: {
        data: {
          name: d.name.trim(),
          phone: d.phone,
          ...(d.district ? { district: d.district } : {}),
          ...(d.homeGym ? { home_gym: d.homeGym.trim() } : {}),
          ...(d.sex ? { sex: d.sex } : {}),
          ...(d.age ? { age: String(d.age) } : {}),
          ...(d.bodyweightKg ? { bodyweight_kg: String(d.bodyweightKg) } : {}),
        },
      },
    });
    if (error) return { error: friendly(error.message) };
    // With "phone confirmations" off (see SETUP-SUPABASE.md) a session comes back immediately.
    return { needsConfirm: !data.session };
  }, []);

  const signInOAuth = useCallback(async (provider: OAuthProvider, next?: string) => {
    const { error } = await supabase().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`,
      },
    });
    return error ? friendly(error.message) : null;
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });
    return error ? friendly(error.message) : null;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase().auth.updateUser({ password });
    return error ? friendly(error.message) : null;
  }, []);

  const updateAccount = useCallback(
    async (changes: { name?: string; email?: string; phone?: string }) => {
      const sb = supabase();
      if (changes.phone !== undefined && userId) {
        const { error: pe } = await sb.from("users").update({ phone: changes.phone }).eq("id", userId);
        if (pe) return { error: pe.message };
        void refresh();
        if (changes.name === undefined && !changes.email) return {};
      }
      const payload: { email?: string; data?: { name: string } } = {};
      if (changes.name !== undefined) payload.data = { name: changes.name.trim() };
      if (changes.email) payload.email = changes.email.trim().toLowerCase();
      const { error } = await sb.auth.updateUser(payload, {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) return { error: friendly(error.message) };
      if (changes.name !== undefined && userId) {
        await sb.from("users").update({ name: changes.name.trim() }).eq("id", userId);
        void refresh();
      }
      return { emailPending: Boolean(changes.email) };
    },
    [userId, refresh],
  );

  const logout = useCallback(async () => {
    const { signOut: clearLocal } = await import("./account");
    const { clearSocial } = await import("./social");
    if (supabaseConfigured) await supabase().auth.signOut();
    clearLocal();
    clearSocial();
    setCloud(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      configured: supabaseConfigured,
      user,
      cloud,
      isPro: isProActive(cloud),
      isAdmin: cloud?.role === "admin",
      refresh,
      signInEmail,
      signInPhone,
      signUpEmail,
      signUpPhone,
      signInOAuth,
      requestPasswordReset,
      updatePassword,
      updateAccount,
      logout,
    }),
    [ready, user, cloud, refresh, signInEmail, signInPhone, signUpEmail, signUpPhone, signInOAuth, requestPasswordReset, updatePassword, updateAccount, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
