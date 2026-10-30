"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Dumbbell,
  Heart,
  Inbox as InboxIcon,
  MapPin,
  MessageCircle,
  PlayCircle,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from "lucide-react";
import type { Lift, Lifter } from "@/lib/types";
import { accountToLifter, useAccount, useIsClient } from "@/lib/account";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { fetchCloudLifter } from "@/lib/cloud-lifters";
import { isUuid, useSocial } from "@/lib/social";
import { metricDots, metricKg } from "@/lib/scoring";
import { BADGE_STYLES, getClubBadge } from "@/lib/badges";
import { ageGroupFor, ageGroupLabel, classLabel, experienceLabel } from "@/lib/categories";
import { LIFTS, LIFT_LABEL } from "@/lib/meet";
import { formatKg, formatRatio, formatScore, initials } from "@/lib/format";
import { ProBadge } from "@/components/account/ProBadge";
import { StoredVideo } from "@/components/ui/StoredVideo";
import { ChatPanel } from "./ChatPanel";
import { MyNetworkCounts } from "./Network";

type Resolved =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "ok"; lifter: Lifter; isMe: boolean; demo: boolean };

/** Finds the lifter: you, a demo lifter on the leaderboard, or a real account in Supabase. */
function useLifter(id: string, demo: Lifter | null): Resolved {
  const { user, configured, isPro } = useAuth();
  const account = useAccount();
  const client = useIsClient();
  const [cloud, setCloud] = useState<Lifter | null | undefined>(undefined);

  const isMe = id === "me" || (!!user && id === user.id);
  const needsCloud = !isMe && !demo && isUuid(id) && configured;

  useEffect(() => {
    if (!needsCloud) return;
    let alive = true;
    fetchCloudLifter(id)
      .then(async (l) => {
        if (!alive) return;
        if (l) return setCloud(l);
        // Joined but no lifts uploaded yet: show the profile with empty lifts.
        const { data } = await supabase()
          .from("public_profiles")
          .select("id, name, sex, age, district, area, home_gym, experience, weight_class, is_pro, created_at")
          .eq("id", id)
          .maybeSingle();
        if (!alive) return;
        if (!data) return setCloud(null);
        setCloud({
          id: data.id,
          name: data.name || "Lifter",
          sex: data.sex === "F" ? "F" : "M",
          age: data.age ?? undefined,
          bodyweightKg: 0,
          homeGym: data.home_gym ?? "",
          district: data.district ?? "",
          area: data.area ?? undefined,
          experience: data.experience ?? undefined,
          weightClass: data.weight_class ?? undefined,
          ageGroup: ageGroupFor(data.age ?? undefined) ?? undefined,
          squatKg: 0,
          benchKg: 0,
          deadliftKg: 0,
          verified: false,
          updatedAt: data.created_at,
          isPro: Boolean(data.is_pro),
        });
      })
      .catch(() => alive && setCloud(null));
    return () => {
      alive = false;
    };
  }, [needsCloud, id]);

  return useMemo<Resolved>(() => {
    if (isMe) {
      if (!client) return { state: "loading" };
      const me = accountToLifter(account, isPro);
      return me ? { state: "ok", lifter: me, isMe: true, demo: false } : { state: "missing" };
    }
    if (demo) return { state: "ok", lifter: demo, isMe: false, demo: true };
    if (!needsCloud) return { state: "missing" };
    if (cloud === undefined) return { state: "loading" };
    return cloud ? { state: "ok", lifter: cloud, isMe: false, demo: false } : { state: "missing" };
  }, [isMe, client, account, isPro, demo, needsCloud, cloud]);
}

function Avatar({ l }: { l: Lifter }) {
  return l.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={l.avatarUrl} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-volt-400/60 sm:h-24 sm:w-24" />
  ) : (
    <span
      aria-hidden
      className={`grid h-20 w-20 shrink-0 place-items-center rounded-full font-display text-3xl font-extrabold ring-2 sm:h-24 sm:w-24 sm:text-4xl ${
        l.sex === "F" ? "bg-blood-500/15 text-blood-300 ring-blood-500/40" : "bg-iron-800 text-iron-200 ring-iron-700"
      }`}
    >
      {initials(l.name)}
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-iron-950 px-3 py-2.5 ring-1 ring-iron-800">
      <p className="text-[10px] font-bold uppercase tracking-stencil text-iron-500">{label}</p>
      <p className="mt-0.5 break-words text-sm font-semibold text-iron-100">{value || "—"}</p>
    </div>
  );
}

export function AthleteProfile({ id, demo }: { id: string; demo: Lifter | null }) {
  const r = useLifter(id, demo);
  const lifterId = r.state === "ok" ? r.lifter.id : id;
  const name = r.state === "ok" ? r.lifter.name : "";
  // The social hook keys on the real id so "me" never gets follow/like state.
  const social = useSocial(lifterId, name);
  const account = useAccount();

  if (r.state === "loading") {
    return <div className="panel h-64 animate-pulse-glow" aria-busy="true" />;
  }
  if (r.state === "missing") {
    return (
      <div className="panel p-8 text-center">
        <p className="font-display text-3xl font-black uppercase">Lifter not found</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-iron-400">
          {id === "me" ? "Finish your profile first, then your page appears here." : "This profile doesn't exist or isn't public."}
        </p>
        <Link href={id === "me" ? "/join" : "/#leaderboard"} className="btn-volt mt-5 inline-flex">
          {id === "me" ? "Complete my profile" : "Back to leaderboard"}
        </Link>
      </div>
    );
  }

  const { lifter: l, isMe, demo: isDemo } = r;
  const total = metricKg(l, "total");
  const hasResults = total > 0;
  const attempts = isMe && account.entry ? account.entry.attempts : null;

  return (
    <div className="space-y-5">
      <Link href="/#leaderboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-iron-400 transition hover:text-volt-300">
        <ArrowLeft className="h-4 w-4" /> Leaderboard
      </Link>

      {/* Header */}
      <section className="panel p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar l={l} />
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1 break-words font-display text-3xl font-black uppercase leading-none sm:text-5xl">
                <span className="break-words">{l.name}</span>
                {l.isPro && <ProBadge compact />}
              </h1>
              <p className="mt-1.5 flex items-center gap-1 text-sm text-iron-400">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="break-words">
                  {[l.homeGym, l.area, l.district].filter(Boolean).join(" · ") || "Bangladesh"}
                </span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {l.verified ? (
                  <span className="chip bg-volt-400/10 text-volt-300 ring-volt-400/40"><ShieldCheck className="h-3 w-3" /> Verified</span>
                ) : (
                  <span className="chip bg-iron-900 text-iron-400 ring-iron-700"><Clock className="h-3 w-3" /> Verification pending</span>
                )}
                {l.isPro && <ProBadge />}
                {isMe && <span className="chip bg-volt-400 text-iron-950 ring-volt-400">You</span>}
                {isDemo && <span className="chip bg-iron-900 text-iron-400 ring-iron-700">Demo lifter</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:flex-col sm:items-stretch">
            {isMe ? (
              <>
                <Link href="/join" className="btn-ghost justify-center">Edit profile</Link>
                <Link href="/messages" className="btn-ghost justify-center"><InboxIcon className="h-4 w-4" /> Inbox</Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void social.toggleFollow()}
                  aria-pressed={social.following}
                  className={`${social.following ? "btn-ghost" : "btn-volt"} justify-center`}
                >
                  {social.following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  {social.following ? "Following" : "Follow"}
                </button>
                <Link href={`/messages?with=${l.id}`} className="btn-ghost justify-center"><MessageCircle className="h-4 w-4" /> Message</Link>
              </>
            )}
          </div>
        </div>
        {isMe ? (
          <MyNetworkCounts />
        ) : (
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-iron-400">
            <span>
              <b className="tabular-nums text-iron-100">{social.followers}</b> {social.followers === 1 ? "follower" : "followers"}
            </span>
            <span>
              <b className="tabular-nums text-iron-100">{social.followingCount}</b> following
            </span>
          </p>
        )}
        {social.error && <p role="alert" className="mt-2 text-sm font-medium text-blood-400">{social.error}</p>}
      </section>

      {/* Info */}
      <section aria-label="Information" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Fact label="Gender" value={l.sex === "F" ? "Female" : "Male"} />
        <Fact label="Age" value={l.age ? `${l.age} yrs${l.ageGroup ? ` · ${ageGroupLabel(l.ageGroup)}` : ""}` : ""} />
        <Fact label="Bodyweight" value={l.bodyweightKg ? `${formatKg(l.bodyweightKg)} kg` : ""} />
        <Fact label="Weight class" value={l.weightClass ? classLabel(l.weightClass) : ""} />
        <Fact label="Experience" value={l.experience ? experienceLabel(l.experience) : ""} />
        <Fact label="Home gym" value={l.homeGym} />
        <Fact label="District" value={l.district} />
        <Fact label="Area" value={l.area ?? ""} />
      </section>

      {/* Lifts */}
      <section aria-label="Lifts" className="panel p-4 sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-extrabold uppercase">
          <Dumbbell className="h-5 w-5 text-volt-400" /> Best lifts
        </h2>
        {hasResults ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([...LIFTS, "total"] as const).map((m) => {
              const kg = metricKg(l, m);
              const badge = getClubBadge(m, kg);
              return (
                <div key={m} className={`min-w-0 rounded-lg p-3 ring-1 ${m === "total" ? "bg-volt-400/10 ring-volt-400/40" : "bg-iron-950 ring-iron-800"}`}>
                  <p className="text-[10px] font-bold uppercase tracking-stencil text-iron-500">{m === "total" ? "Total" : LIFT_LABEL[m]}</p>
                  <p className="font-display text-3xl font-black tabular-nums leading-tight text-iron-50">
                    {kg ? formatKg(kg) : "—"}<span className="ml-1 text-xs font-bold text-iron-500">kg</span>
                  </p>
                  {kg > 0 && l.bodyweightKg > 0 && (
                    <p className="text-xs tabular-nums text-iron-400">
                      {formatScore(metricDots(l, m))} DOTS · {formatRatio(kg / l.bodyweightKg)} BW
                    </p>
                  )}
                  {badge && <span className={`chip mt-1.5 ${BADGE_STYLES[badge.tier]}`}>{badge.label}</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-iron-400">
            {isMe ? "No judged lifts yet. Record your attempts and they show up here." : "No judged lifts published yet."}
          </p>
        )}
      </section>

      {/* Videos */}
      <section aria-label="Videos" className="panel p-4 sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-extrabold uppercase">
          <PlayCircle className="h-5 w-5 text-volt-400" /> Lift videos
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {LIFTS.map((lift: Lift) => {
            const kg = metricKg(l, lift);
            const mine = attempts?.[lift].filter((a) => a.videoId && (a.status === "good" || a.status === "submitted" || a.status === "no_lift")) ?? [];
            const best = mine.filter((a) => a.status === "good").sort((a, b) => b.weightKg - a.weightKg)[0] ?? mine[mine.length - 1];
            const hasVideo = isMe ? Boolean(best?.videoId) : kg > 0 && (Boolean(l.videoUrl) || Boolean(l.proofOnFile));
            const likes = social.likeCount(lift);
            return (
              <div key={lift} className="min-w-0 rounded-lg bg-iron-950 p-3 ring-1 ring-iron-800">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-display text-lg font-extrabold uppercase">{LIFT_LABEL[lift]}</p>
                  {(isMe ? best : kg > 0) && (
                    <span className="text-sm font-semibold tabular-nums text-iron-300">{formatKg(isMe ? best!.weightKg : kg)} kg</span>
                  )}
                </div>
                {isMe && best?.videoId ? (
                  <StoredVideo videoId={best.videoId} className="max-h-48" />
                ) : hasVideo ? (
                  <div className="grid h-32 place-items-center rounded-lg bg-iron-900 text-center ring-1 ring-iron-800">
                    <div>
                      <PlayCircle className="mx-auto h-9 w-9 text-volt-400" />
                      <p className="mt-1 text-xs text-iron-400">Demo proof clip</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid h-32 place-items-center rounded-lg bg-iron-900 px-2 text-center text-xs text-iron-500 ring-1 ring-iron-800">
                    {isMe ? "No video yet. Record an attempt." : "No video yet"}
                  </div>
                )}
                <button
                  type="button"
                  disabled={isMe || !hasVideo}
                  onClick={() => void social.toggleLike(lift)}
                  aria-pressed={social.liked(lift)}
                  className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    social.liked(lift) ? "bg-blood-500/15 text-blood-300 ring-blood-500/50" : "bg-iron-900 text-iron-300 ring-iron-700 hover:text-volt-300"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${social.liked(lift) ? "fill-current" : ""}`} />
                  <span className="tabular-nums">{likes}</span>
                  <span className="sr-only">{social.liked(lift) ? "Unlike" : "Like"} {LIFT_LABEL[lift]} video</span>
                </button>
              </div>
            );
          })}
        </div>
        {isDemo && <p className="mt-3 text-xs text-iron-500">Demo lifters have no real footage. Your likes on them stay on this device.</p>}
        {!isDemo && !isMe && !hasResults && <p className="mt-3 text-xs text-iron-500">Videos appear here once this lifter&apos;s attempts are judged.</p>}
      </section>

      {!isMe && <ChatPanel messages={social.messages} send={social.send} demo={isDemo} loading={social.loading} id={l.id} />}
    </div>
  );
}
