"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Film, Link2, Trophy, Upload, Share2 } from "lucide-react";
import {
  saveProfile,
  savePR,
  uid,
  useAccount,
  useIsClient,
  type PRRecord,
  type Profile,
} from "@/lib/account";
import { calculateDots } from "@/lib/scoring";
import { getClubBadge, BADGE_STYLES } from "@/lib/badges";
import { formatKg, formatScore } from "@/lib/format";
import { deleteVideo, getVideo, saveVideo } from "@/lib/video-store";
import { Field } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { DecimalInput } from "@/components/ui/DecimalInput";

const MAX_VIDEO_MB = 300;
const LIFT_CAPS = { squat: 500, bench: 350, deadlift: 500 } as const;

const num = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const initialStr = (n: number | undefined) => (n && n > 0 ? String(n) : "");

export function LogPrForm() {
  const ready = useIsClient();
  const { profile, pr } = useAccount();
  if (!ready || !profile) return null; // RequireProfile handles the gate
  return <LogInner profile={profile} pr={pr} />;
}

function LogInner({ profile, pr }: { profile: Profile; pr: PRRecord | null }) {
  const [squat, setSquat] = useState(initialStr(pr?.squatKg));
  const [bench, setBench] = useState(initialStr(pr?.benchKg));
  const [deadlift, setDeadlift] = useState(initialStr(pr?.deadliftKg));
  const [bw, setBw] = useState(String(profile.bodyweightKg));

  const [mode, setMode] = useState<"upload" | "link">(pr?.videoUrl ? "link" : "upload");
  const [link, setLink] = useState(pr?.videoUrl ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<PRRecord | null>(null);

  // Preview: newly picked file, or the video already stored on this device.
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    (async () => {
      if (file) {
        url = URL.createObjectURL(file);
      } else if (pr?.videoId && mode === "upload") {
        try {
          const blob = await getVideo(pr.videoId);
          if (blob && !cancelled) url = URL.createObjectURL(blob);
        } catch {
          /* IndexedDB unavailable */
        }
      }
      if (cancelled) {
        if (url) URL.revokeObjectURL(url);
      } else {
        setPreviewUrl(url);
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, mode, pr?.videoId]);

  // Live score preview
  const s = num(squat);
  const b = num(bench);
  const d = num(deadlift);
  const bwNum = parseFloat(bw);
  const total = s > 0 && b > 0 && d > 0 ? s + b + d : 0;
  const dots = total > 0 && bwNum > 0 ? calculateDots(total, bwNum, profile.sex) : 0;
  const totalBadge = getClubBadge("total", total);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    (
      [
        ["squat", squat, "squat"],
        ["bench", bench, "bench"],
        ["deadlift", deadlift, "deadlift"],
      ] as const
    ).forEach(([key, val, cap]) => {
      if (val.trim() === "") return;
      const n = parseFloat(val);
      if (!(n >= 0 && n <= LIFT_CAPS[cap])) errs[key] = `Enter 0–${LIFT_CAPS[cap]} kg.`;
    });
    if (!errs.squat && !errs.bench && !errs.deadlift && s + b + d === 0) {
      errs.squat = "Log at least one lift.";
    }
    if (!(bwNum >= 30 && bwNum <= 250)) errs.bw = "Bodyweight must be 30–250 kg.";

    if (mode === "link" && link.trim()) {
      try {
        const u = new URL(link.trim());
        if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
      } catch {
        errs.video = "Enter a valid link starting with https://";
      }
    }
    if (mode === "upload" && file) {
      if (!file.type.startsWith("video/")) errs.video = "That file isn't a video.";
      else if (file.size > MAX_VIDEO_MB * 1024 * 1024)
        errs.video = `Video is too large (max ${MAX_VIDEO_MB} MB). Trim it or paste a link.`;
    }

    // A new or higher lift needs fresh video proof (corrections/lower numbers don't).
    if (!errs.squat && !errs.bench && !errs.deadlift && !errs.video) {
      const prev = pr ?? { squatKg: 0, benchKg: 0, deadliftKg: 0 };
      const improved = s > prev.squatKg || b > prev.benchKg || d > prev.deadliftKg;
      if (improved) {
        if (mode === "upload" && !file) {
          errs.video = "New PR = new video. Upload the video of this lift (or paste a link).";
        } else if (mode === "link" && (!link.trim() || link.trim() === pr?.videoUrl)) {
          errs.video = "New PR = new video. Paste the link of the video showing this lift.";
        }
      }
    }

    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    let videoId = pr?.videoId;
    let videoUrl: string | undefined;

    if (mode === "upload") {
      if (file) {
        const id = videoId ?? uid();
        try {
          await saveVideo(id, file);
          videoId = id;
        } catch {
          setSaving(false);
          setErrors({
            video: "Couldn't store the video on this device (storage full?). Paste a link instead.",
          });
          return;
        }
      }
    } else {
      videoUrl = link.trim() || undefined;
      if (videoId) {
        deleteVideo(videoId).catch(() => {});
        videoId = undefined;
      }
    }

    const next: PRRecord = {
      squatKg: s,
      benchKg: b,
      deadliftKg: d,
      videoUrl,
      videoId,
      updatedAt: new Date().toISOString(),
      previous: pr
        ? { squatKg: pr.squatKg, benchKg: pr.benchKg, deadliftKg: pr.deadliftKg }
        : undefined,
    };

    const rounded = Math.round(bwNum * 10) / 10;
    if (rounded !== profile.bodyweightKg) saveProfile({ ...profile, bodyweightKg: rounded });
    const ok = savePR(next);
    setSaving(false);
    if (!ok) {
      setErrors({ video: "Couldn't save — browser storage is full or blocked." });
      return;
    }
    setSaved(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (saved) return <Success pr={saved} profile={{ ...profile, bodyweightKg: Math.round(bwNum * 10) / 10 }} />;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="panel space-y-6 p-5 sm:p-8">
        {pr && (
          <div className="rounded-xl bg-volt-400/[0.07] p-4 ring-1 ring-volt-400/30">
            <p className="font-display text-xl font-extrabold uppercase tracking-wide text-volt-300">
              Broke a PR? Update it
            </p>
            <p className="mt-1 text-sm text-iron-300">
              Current: squat <b>{formatKg(pr.squatKg)}</b> · bench <b>{formatKg(pr.benchKg)}</b> ·
              deadlift <b>{formatKg(pr.deadliftKg)}</b> kg. Enter your new numbers and add a new
              video of the lift.
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 items-start gap-3 sm:gap-5">
          {(
            [
              ["squat", "Squat", squat, setSquat],
              ["bench", "Bench", bench, setBench],
              ["deadlift", "Deadlift", deadlift, setDeadlift],
            ] as const
          ).map(([key, label, val, set]) => (
            <Field key={key} label={label} htmlFor={key} error={errors[key]}>
              <DecimalInput
                id={key}
                suffix="kg"
                className="!py-3 font-display text-2xl font-extrabold tabular-nums"
                value={val}
                onChange={set}
                placeholder="0"
              />
            </Field>
          ))}
        </div>

        <Field label="Bodyweight today (kg)" htmlFor="bw" error={errors.bw}>
          <div className="sm:max-w-[12rem]">
            <DecimalInput id="bw" suffix="kg" value={bw} onChange={setBw} placeholder="e.g. 83" />
          </div>
        </Field>

        {/* Video proof */}
        <div className="space-y-3 rounded-xl bg-iron-950 p-4 ring-1 ring-iron-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-xl font-extrabold uppercase tracking-wide">
                Video proof
              </p>
              <p className="text-xs text-iron-400">
                Every new PR needs a video. Show the full lift, plates visible. Reviewed videos
                earn the ✔ Verified badge.
              </p>
            </div>
            <div className="w-56">
              <Segmented<"upload" | "link">
                label="Method"
                value={mode}
                onChange={setMode}
                options={[
                  { id: "upload", label: "Upload" },
                  { id: "link", label: "Paste link" },
                ]}
              />
            </div>
          </div>

          {mode === "upload" ? (
            <div>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-iron-700 px-4 py-8 text-center transition hover:border-volt-400/70 hover:bg-iron-900">
                <Upload className="h-7 w-7 text-volt-400" />
                <span className="font-semibold">
                  {file ? file.name : pr?.videoId ? "Replace your uploaded video" : "Tap to choose a video"}
                </span>
                <span className="text-xs text-iron-500">
                  MP4 / MOV · up to {MAX_VIDEO_MB} MB
                  {file ? ` · ${(file.size / 1024 / 1024).toFixed(1)} MB selected` : ""}
                </span>
                <input
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {previewUrl && (
                <video
                  src={previewUrl}
                  controls
                  playsInline
                  className="mt-3 max-h-80 w-full rounded-lg bg-black"
                />
              )}
              <p className="mt-2 text-xs text-iron-500">
                Demo mode: uploaded videos are kept on this device until cloud storage is connected.
                For review today, paste a YouTube / Instagram / Facebook link.
              </p>
            </div>
          ) : (
            <Field label="Video link" htmlFor="video" error={errors.video}>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-iron-500" />
                <input
                  id="video"
                  type="url"
                  className="field pl-9"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://instagram.com/reel/…"
                />
              </div>
            </Field>
          )}
          {mode === "upload" && errors.video && (
            <p role="alert" className="text-xs font-medium text-blood-400">
              {errors.video}
            </p>
          )}
        </div>

        <button type="submit" disabled={saving} className="btn-volt w-full sm:w-auto">
          <Trophy className="h-5 w-5" />
          {saving ? "Saving…" : pr ? "Update my PR" : "Save my PR"}
        </button>
      </div>

      {/* Live preview */}
      <aside className="panel h-fit space-y-4 p-5 lg:sticky lg:top-24">
        <p className="eyebrow">Live score</p>
        <div>
          <p className="font-display text-6xl font-black leading-none tabular-nums text-volt-400">
            {dots > 0 ? formatScore(dots) : "—"}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-stencil text-iron-500">DOTS</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-iron-500">Total</dt>
            <dd className="font-display text-2xl font-extrabold tabular-nums">
              {total > 0 ? `${formatKg(total)} kg` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-iron-500">× bodyweight</dt>
            <dd className="font-display text-2xl font-extrabold tabular-nums">
              {total > 0 && bwNum > 0 ? (total / bwNum).toFixed(2) : "—"}
            </dd>
          </div>
        </dl>
        {totalBadge && (
          <span className={`chip ${BADGE_STYLES[totalBadge.tier]}`}>{totalBadge.label}</span>
        )}
        <p className="text-xs text-iron-500">
          Fill all three lifts to get a total and ranking.
        </p>
      </aside>
    </form>
  );
}

function Success({ pr, profile }: { pr: PRRecord; profile: Profile }) {
  const total = pr.squatKg > 0 && pr.benchKg > 0 && pr.deadliftKg > 0
    ? pr.squatKg + pr.benchKg + pr.deadliftKg
    : 0;
  const dots = total ? calculateDots(total, profile.bodyweightKg, profile.sex) : 0;

  const rows = [
    { label: "Squat", now: pr.squatKg, before: pr.previous?.squatKg ?? 0 },
    { label: "Bench", now: pr.benchKg, before: pr.previous?.benchKg ?? 0 },
    { label: "Deadlift", now: pr.deadliftKg, before: pr.previous?.deadliftKg ?? 0 },
  ];

  return (
    <div className="panel animate-rise space-y-6 p-6 text-center sm:p-10">
      <CheckCircle2 className="mx-auto h-12 w-12 text-volt-400" />
      <div>
        <p className="font-display text-5xl font-black uppercase leading-none">PR logged</p>
        <p className="mt-2 text-sm text-iron-400">
          You&apos;re on the board. {pr.videoId || pr.videoUrl ? "Proof submitted for review." : "Add a video to earn ✔ Verified."}
        </p>
      </div>

      <div className="mx-auto grid max-w-md grid-cols-3 gap-3">
        {rows.map((r) => {
          const delta = r.now - r.before;
          return (
            <div key={r.label} className="rounded-xl bg-iron-950 p-3 ring-1 ring-iron-800">
              <p className="text-[11px] font-bold uppercase tracking-stencil text-iron-500">{r.label}</p>
              <p className="font-display text-3xl font-black tabular-nums">{r.now > 0 ? formatKg(r.now) : "—"}</p>
              {r.now > 0 && pr.previous && delta > 0 && (
                <p className="text-xs font-bold text-volt-400">+{formatKg(delta)} kg</p>
              )}
            </div>
          );
        })}
      </div>

      {dots > 0 && (
        <p className="font-display text-2xl font-extrabold">
          <span className="text-volt-400">{formatScore(dots)}</span> DOTS · {formatKg(total)} kg total
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/flex" className="btn-volt">
          <Share2 className="h-5 w-5" /> Make my Flex Card
        </Link>
        <Link href="/#leaderboard" className="btn-ghost">
          <Film className="h-5 w-5" /> See the board
        </Link>
      </div>
    </div>
  );
}
