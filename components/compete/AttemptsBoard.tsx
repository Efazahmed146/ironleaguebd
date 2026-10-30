"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Lock, XCircle } from "lucide-react";
import { getAccount, saveEntry, uid, useAccount, useIsClient, type Profile } from "@/lib/account";
import { Camera, ShieldCheck } from "lucide-react";
import {
  LIFTS,
  LIFT_LABEL,
  MEET,
  MAX_ATTEMPTS,
  MIN_JUMP_KG,
  bestGood,
  canLift,
  declareAttempt,
  demoJudgeGood,
  isOfficial,
  attachAiReview,
  submitAttempt,
  type Attempt,
  type MeetEntry,
} from "@/lib/meet";
import { calculateDots } from "@/lib/scoring";
import { formatKg, formatScore } from "@/lib/format";
import { enqueueUpload, saveFrames } from "@/lib/video-store";
import { uploadLiftVideo } from "@/lib/cloud-upload";
import { extractFrames, runAiReview } from "@/lib/ai-review";
import type { Lift } from "@/lib/types";
import { DecimalInput } from "@/components/ui/DecimalInput";
import { LiftRecorder, type RecordedClip } from "@/components/camera/LiftRecorder";
import { StandardsNotice } from "@/components/compete/StandardsNotice";

export function AttemptsBoard() {
  const ready = useIsClient();
  const { profile, entry } = useAccount();
  if (!ready || !profile) return null;
  if (!entry) {
    return (
      <div className="panel flex flex-col items-center gap-4 px-6 py-12 text-center">
        <p className="font-display text-3xl font-black uppercase">Register for the meet first</p>
        <Link href="/compete/register" className="btn-volt">
          Choose category
        </Link>
      </div>
    );
  }
  return <Board profile={profile} entry={entry} />;
}

function Board({ profile, entry }: { profile: Profile; entry: MeetEntry }) {
  const open = canLift(entry);
  const bests = LIFTS.map((l) => bestGood(entry, l));
  const complete = bests.every((b) => b > 0);
  const total = bests.reduce((a, b) => a + b, 0);
  const dots = complete ? calculateDots(total, profile.bodyweightKg, profile.sex) : 0;

  return (
    <div className="space-y-6">
      {!open && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blood-500/10 p-4 ring-1 ring-blood-500/40">
          <p className="flex items-center gap-2 text-sm text-iron-100">
            <Lock className="h-4 w-4 text-blood-400" />
            Finish your weigh-in and entry fee to unlock your attempts.
          </p>
          <Link href="/compete" className="btn-ghost !py-2 text-sm">
            Go to hub
          </Link>
        </div>
      )}
      {open && !isOfficial(entry) && (
        <p className="rounded-xl bg-iron-900 p-4 text-sm text-iron-300 ring-1 ring-iron-700">
          Your results are <b className="text-iron-100">provisional</b> until a moderator approves your
          weigh-in and entry fee.
        </p>
      )}

      <div className="panel grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        {LIFTS.map((l, i) => (
          <div key={l}>
            <p className="text-[11px] font-bold uppercase tracking-stencil text-iron-500">Best {LIFT_LABEL[l]}</p>
            <p className="font-display text-3xl font-black tabular-nums">
              {bests[i]! > 0 ? `${formatKg(bests[i]!)} kg` : "—"}
            </p>
          </div>
        ))}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-stencil text-iron-500">Total · DOTS</p>
          <p className="font-display text-3xl font-black tabular-nums text-volt-400">
            {complete ? `${formatKg(total)} · ${formatScore(dots)}` : "—"}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-iron-900 p-4 text-sm text-iron-300 ring-1 ring-iron-700">
        <b className="text-iron-100">How attempts work:</b> you get 3 per lift. Declare the weight, lift it
        on the in-app camera, submit the clip, then a moderator marks it Good Lift or No Lift. Your best Good
        Lift counts. Weights can only go up (at least {MIN_JUMP_KG} kg after a Good Lift). Once you submit
        the recording, the weight is locked.
      </div>

      {LIFTS.map((l) => (
        <LiftSection key={l} lift={l} entry={entry} enabled={open} />
      ))}
    </div>
  );
}

function LiftSection({ lift, entry, enabled }: { lift: Lift; entry: MeetEntry; enabled: boolean }) {
  const attempts = entry.attempts[lift];
  const best = bestGood(entry, lift);
  const last = attempts[attempts.length - 1];
  const nextOpen = !last || last.status === "good" || last.status === "no_lift";

  return (
    <section className="panel space-y-4 p-5 sm:p-6" aria-labelledby={`lift-${lift}`}>
      <div className="flex items-end justify-between gap-3">
        <h2 id={`lift-${lift}`} className="font-display text-4xl font-black uppercase leading-none">
          {LIFT_LABEL[lift]}
        </h2>
        <p className="text-right text-sm text-iron-400">
          Best Good Lift
          <span className="block font-display text-3xl font-black text-volt-400">
            {best > 0 ? `${formatKg(best)} kg` : "—"}
          </span>
        </p>
      </div>

      <StandardsNotice lift={lift} />

      <div className="space-y-3">
        {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
          const a = attempts[i];
          if (a && a.status !== "declared") return <AttemptRow key={i} n={i + 1} a={a} lift={lift} index={i} />;
          if (a && a.status === "declared") {
            return <AttemptEditor key={i} lift={lift} n={i + 1} attempt={a} enabled={enabled} prev={attempts[i - 1]} />;
          }
          if (i === attempts.length && nextOpen) {
            return <AttemptEditor key={i} lift={lift} n={i + 1} enabled={enabled} prev={attempts[i - 1]} />;
          }
          return (
            <div key={i} className="flex items-center gap-3 rounded-lg bg-iron-950 p-3.5 text-sm text-iron-500 ring-1 ring-iron-800">
              <Lock className="h-4 w-4" />
              Attempt {i + 1} unlocks after attempt {i} is reviewed.
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AttemptRow({ n, a, lift, index }: { n: number; a: Attempt; lift: Lift; index: number }) {
  const style =
    a.status === "good"
      ? "bg-volt-400/10 ring-volt-400/40"
      : a.status === "no_lift"
        ? "bg-blood-500/10 ring-blood-500/40"
        : "bg-iron-950 ring-iron-800";
  return (
    <div className={`rounded-lg p-3.5 ring-1 ${style}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-2xl font-extrabold tabular-nums">
          <span className="mr-2 text-sm font-bold uppercase tracking-stencil text-iron-500">Attempt {n}</span>
          {formatKg(a.weightKg)} kg
        </p>
        {a.status === "good" && (
          <span className="chip bg-volt-400 text-iron-950 ring-volt-400">
            <CheckCircle2 className="h-3 w-3" /> Good Lift
          </span>
        )}
        {a.status === "no_lift" && (
          <span className="chip bg-blood-500 text-white ring-blood-500">
            <XCircle className="h-3 w-3" /> No Lift
          </span>
        )}
        {a.status === "submitted" && (
          <span className="chip bg-iron-800 text-iron-200 ring-iron-700">
            <Clock className="h-3 w-3" /> Waiting for judge
          </span>
        )}
      </div>
      {a.status === "submitted" && MEET.demoSkips && (
        <button
          type="button"
          className="mt-2 text-xs font-semibold text-amber-200 underline"
          onClick={() => {
            const e = getAccount().entry;
            if (!e) return;
            const r = demoJudgeGood(e, lift, index);
            if ("entry" in r) saveEntry(r.entry);
          }}
        >
          Skip judging: mark Good Lift (demo only)
        </button>
      )}
      {a.recording && (
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-iron-400">
          <span className="chip bg-iron-900 text-volt-300 ring-iron-700">
            <Camera className="h-3 w-3" /> {a.recording.source === "demo_skip" ? "Demo clip (camera skipped)" : "Natively Recorded"}
          </span>
          {a.dots !== undefined && <span>DOTS {formatScore(a.dots)}</span>}
          {a.ai && a.ai.status === "done" && (
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> AI pre-check done
            </span>
          )}
        </p>
      )}
      {a.status === "no_lift" && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-blood-300">
          {a.reasons?.map((r) => <li key={r}>{r}</li>)}
          {a.note && <li>Note: {a.note}</li>}
        </ul>
      )}
    </div>
  );
}

function AttemptEditor({
  lift,
  n,
  attempt,
  prev,
  enabled,
}: {
  lift: Lift;
  n: number;
  attempt?: Attempt;
  prev?: Attempt;
  enabled: boolean;
}) {
  const { profile, entry } = useAccount();
  const [weight, setWeight] = useState(attempt ? String(attempt.weightKg) : "");
  const [err, setErr] = useState("");
  const [recording, setRecording] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [busy, setBusy] = useState(false);

  const minHint = prev
    ? prev.status === "good"
      ? `Minimum ${formatKg(prev.weightKg + MIN_JUMP_KG)} kg (weights only go up)`
      : `Minimum ${formatKg(prev.weightKg)} kg (weights only go up)`
    : "Choose your opening weight";

  // Official bodyweight: the scale reading once a moderator approved it, otherwise your profile weight.
  const bodyKg = entry?.weighIn?.status === "approved" ? entry.weighIn.measuredKg : (profile?.bodyweightKg ?? 0);
  const previewDots = attempt && profile ? calculateDots(attempt.weightKg, bodyKg, profile.sex) : 0;

  function onDeclare() {
    setErr("");
    const e = getAccount().entry;
    if (!e) return;
    const r = declareAttempt(e, lift, parseFloat(weight));
    if ("error" in r) return setErr(r.error);
    if (!saveEntry(r.entry)) setErr("Couldn't save (browser storage full).");
  }

  async function onSubmitClip(clip: RecordedClip) {
    setSubmitErr("");
    const acct = getAccount();
    const e = acct.entry;
    if (!e || !acct.profile || !attempt) return;

    setBusy(true);
    try {
      const videoId = uid();
      await enqueueUpload(videoId, clip.blob);

      const bw = e.weighIn?.status === "approved" ? e.weighIn.measuredKg : acct.profile.bodyweightKg;
      const dots = calculateDots(attempt.weightKg, bw, acct.profile.sex);

      const r = submitAttempt(e, lift, { videoId, recording: clip.recording, dots });
      if ("error" in r) return setSubmitErr(r.error);
      if (!saveEntry(r.entry)) return setSubmitErr("Couldn't save (browser storage full).");
      const index = r.entry.attempts[lift].length - 1;
      const weightKg = attempt.weightKg;
      setRecording(false);
      void uploadLiftVideo(videoId, clip.blob); // cloud copy (Pro, signed in); the clip also stays on this device

      // AI pre-check runs in the background; the moderator always has the final say.
      void (async () => {
        let frames: string[] = [];
        try {
          frames = await extractFrames(clip.blob, clip.recording.durationSec);
          if (frames.length) await saveFrames(videoId, frames);
        } catch {
          /* frames are optional */
        }
        const ai = await runAiReview(lift, frames, weightKg);
        const cur = getAccount().entry;
        const next = cur && attachAiReview(cur, lift, index, ai);
        if (next) saveEntry(next);
      })();
    } catch {
      setSubmitErr("Couldn't store the recording on this device (storage full?). Free some space and retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`space-y-3 rounded-lg p-4 ring-1 ${attempt ? "bg-iron-950 ring-volt-400/40" : "bg-iron-950 ring-iron-800"}`}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <label
            htmlFor={`${lift}-${n}`}
            className="mb-1.5 block text-[11px] font-bold uppercase tracking-stencil text-iron-500"
          >
            Attempt {n} weight
          </label>
          <DecimalInput
            id={`${lift}-${n}`}
            suffix="kg"
            className="!py-3 font-display text-2xl font-extrabold"
            value={weight}
            onChange={setWeight}
            placeholder="0"
            disabled={!enabled}
          />
        </div>
        <button type="button" onClick={onDeclare} disabled={!enabled || !weight} className="btn-ghost !py-3 text-sm">
          {attempt ? "Change weight" : "Declare attempt"}
        </button>
        <p className="pb-3 text-xs text-iron-500">{minHint}</p>
      </div>
      {err && (
        <p role="alert" className="text-xs font-medium text-blood-400">
          {err}
        </p>
      )}

      {attempt && (
        <div className="space-y-3 border-t border-iron-800 pt-3">
          <p className="text-sm text-iron-300">
            <b className="text-volt-300">{formatKg(attempt.weightKg)} kg declared</b> (DOTS{" "}
            {formatScore(previewDots)}). Record the lift live with the in-app camera. The bar and plates
            must be clearly visible. Gallery uploads aren&apos;t possible.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitErr("");
              setRecording(true);
            }}
            disabled={!enabled}
            className="btn-volt"
          >
            <Camera className="h-4 w-4" /> Record PR / Attempt
          </button>
          {!recording && submitErr && (
            <p role="alert" className="text-xs font-medium text-blood-400">
              {submitErr}
            </p>
          )}
        </div>
      )}

      {recording && attempt && (
        <LiftRecorder
          lift={lift}
          weightKg={attempt.weightKg}
          dots={previewDots}
          busy={busy}
          submitError={submitErr}
          onSubmit={onSubmitClip}
          onClose={() => setRecording(false)}
        />
      )}
    </div>
  );
}
