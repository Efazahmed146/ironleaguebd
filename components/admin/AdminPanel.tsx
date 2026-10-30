"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { getAccount, saveEntry, useAccount, useIsClient, type Profile } from "@/lib/account";
import { classLabel, classRange, weightClassFor } from "@/lib/categories";
import {
  LIFTS,
  LIFT_LABEL,
  MEET,
  NO_LIFT_REASONS,
  feeRequired,
  reviewAttempt,
  type Attempt,
  type MeetEntry,
  type ReviewStatus,
  paymentLabel,
} from "@/lib/meet";
import type { Lift } from "@/lib/types";
import { formatKg, formatScore } from "@/lib/format";
import type { AiReview } from "@/lib/ai-review";
import { StoredVideo } from "@/components/ui/StoredVideo";

const PIN_KEY = "ironleague:admin";

export function AdminPanel() {
  const ready = useIsClient();
  const { profile, entry } = useAccount();
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinErr, setPinErr] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(PIN_KEY) === "1") setUnlocked(true);
    } catch {
      /* ignore */
    }
  }, []);

  if (!ready) return null;

  if (!unlocked) {
    return (
      <div className="panel mx-auto max-w-sm space-y-4 p-6">
        <ShieldAlert className="h-8 w-8 text-volt-400" />
        <p className="font-display text-3xl font-black uppercase">Moderator login</p>
        <p className="text-xs text-iron-500">Demo PIN: {MEET.adminPin}. Real admin roles come with the backend.</p>
        <input
          className="field"
          inputMode="numeric"
          type="password"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setPinErr(false);
          }}
          placeholder="PIN"
          aria-label="Moderator PIN"
        />
        {pinErr && <p className="text-xs font-medium text-blood-400">Wrong PIN.</p>}
        <button
          type="button"
          className="btn-volt w-full"
          onClick={() => {
            if (pin === MEET.adminPin) {
              try {
                sessionStorage.setItem(PIN_KEY, "1");
              } catch {
                /* ignore */
              }
              setUnlocked(true);
            } else setPinErr(true);
          }}
        >
          Enter
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-iron-900 p-4 text-sm text-iron-300 ring-1 ring-iron-700">
        <b className="text-iron-100">Demo moderator panel.</b> It shows the entry saved on this device.
        With Supabase connected, this becomes a queue of every lifter&apos;s weigh-ins, payments and
        attempts, restricted to users with the admin or judge role.
      </div>

      {!profile || !entry ? (
        <div className="panel p-8 text-center text-iron-400">
          Nothing to review yet. Register for the meet and submit a weigh-in first.
        </div>
      ) : (
        <Review profile={profile} entry={entry} />
      )}
    </div>
  );
}

/* ---------------- helpers ---------------- */

function setReview(
  kind: "weighIn" | "payment",
  status: ReviewStatus,
  note: string,
) {
  const e = getAccount().entry;
  if (!e || !e[kind]) return;
  saveEntry({ ...e, [kind]: { ...e[kind]!, status, note: note.trim() || undefined } });
}

function Decision({ kind, status }: { kind: "weighIn" | "payment"; status: ReviewStatus }) {
  const [note, setNote] = useState("");
  return (
    <div className="space-y-2 border-t border-iron-800 pt-3">
      <input
        className="field"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note for the lifter (required when rejecting)"
        aria-label="Moderator note"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-volt !py-2 text-sm" onClick={() => setReview(kind, "approved", note)}>
          <CheckCircle2 className="h-4 w-4" /> Approve
        </button>
        <button
          type="button"
          className="btn-ghost !py-2 text-sm !text-blood-400"
          onClick={() => note.trim() && setReview(kind, "rejected", note)}
          disabled={!note.trim()}
        >
          <XCircle className="h-4 w-4" /> Reject
        </button>
        <span className="text-xs text-iron-500">Current: {status}</span>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel space-y-3 p-5">
      <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  );
}

/* ---------------- review ---------------- */

function Review({ profile, entry }: { profile: Profile; entry: MeetEntry }) {
  const w = entry.weighIn;
  const p = entry.payment;
  const r = classRange(entry.weightClass, profile.sex);
  const fits = w ? w.measuredKg > r.min && (r.max === null || w.measuredKg <= r.max) : false;

  return (
    <div className="space-y-6">
      <Section title="Lifter">
        <p className="text-sm text-iron-300">
          <b className="text-iron-50">{profile.name}</b> · {profile.age} yrs · {profile.sex === "M" ? "Male" : "Female"} ·{" "}
          {profile.district} · {profile.homeGym}
          <br />
          Entered: {classLabel(entry.weightClass)} · {entry.experience} · profile weight {profile.bodyweightKg} kg
        </p>
      </Section>

      <Section title="Weigh-in">
        {!w ? (
          <p className="text-sm text-iron-500">No weigh-in submitted.</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {w.photoDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.photoDataUrl} alt="Weigh-in" className="w-full rounded-lg ring-1 ring-iron-700" />
              )}
              <div className="space-y-2 text-sm text-iron-300">
                <p>
                  Scale reading: <b className="text-iron-50">{w.measuredKg} kg</b>{" "}
                  <span className={fits ? "text-volt-300" : "text-blood-400"}>
                    {fits
                      ? `✔ fits ${classLabel(entry.weightClass)}`
                      : `✖ outside ${classLabel(entry.weightClass)} (belongs in ${
                          weightClassFor(w.measuredKg, profile.sex) ?? "?"
                        })`}
                  </span>
                </p>
                <p>
                  Required code: <b className="text-volt-300">{w.code}</b> (must be visible on paper)
                </p>
                <p>
                  Photo taken: {w.photoTakenAt ? new Date(w.photoTakenAt).toLocaleString("en-GB") : "unknown"}
                  <br />
                  Submitted: {new Date(w.submittedAt).toLocaleString("en-GB")}
                </p>
                {w.source === "demo_skip" && (
                  <p className="text-xs font-semibold text-amber-200">Demo photo: camera was skipped.</p>
                )}
                <p className="text-xs text-iron-500">
                  Check: scale display readable, the code and a time reference in frame, photo time close to
                  submit time.
                </p>
              </div>
            </div>
            <Decision kind="weighIn" status={w.status} />
          </>
        )}
      </Section>

      {feeRequired() && (
        <Section title="Entry fee">
          {!p ? (
            <p className="text-sm text-iron-500">No payment submitted.</p>
          ) : (
            <>
              <p className="text-sm text-iron-300">
                {paymentLabel(p)}
                {p.method !== "gateway" && p.senderNumber ? (
                  <>
                    {" "}· from <b>{p.senderNumber}</b>
                  </>
                ) : null}{" "}
                · {p.method === "gateway" ? "Ref" : "TrxID"} <b className="text-volt-300 break-all">{p.trxId}</b>
                <br />
                <span className="text-xs text-iron-500">
                  {p.method === "gateway"
                    ? "Paid online and confirmed automatically by the payment gateway."
                    : `Match the TrxID, amount and sender number in your ${p.method === "bkash" ? "bKash" : "Nagad"} statement.`}
                </span>
              </p>
              <Decision kind="payment" status={p.status} />
            </>
          )}
        </Section>
      )}

      <Section title="Attempts to judge">
        {LIFTS.every((l) => entry.attempts[l].length === 0) && (
          <p className="text-sm text-iron-500">No attempts yet.</p>
        )}
        {LIFTS.map((l) =>
          entry.attempts[l].map((a, i) =>
            a.status === "declared" ? null : <AttemptReview key={`${l}-${i}`} lift={l} index={i} attempt={a} />,
          ),
        )}
      </Section>
    </div>
  );
}

function AiPanel({ lift, ai }: { lift: Lift; ai?: AiReview }) {
  const tone = (r: "pass" | "fail" | "unclear") =>
    r === "pass" ? "text-volt-300" : r === "fail" ? "text-blood-400" : "text-iron-400";
  const icon = (r: "pass" | "fail" | "unclear") => (r === "pass" ? "✔" : r === "fail" ? "✖" : "?");
  return (
    <div className="rounded-lg bg-iron-900 p-3 ring-1 ring-iron-800">
      <p className="text-[11px] font-bold uppercase tracking-stencil text-iron-500">
        AI form pre-check (advisory) · {LIFT_LABEL[lift]}
      </p>
      {!ai ? (
        <p className="mt-1 text-xs text-iron-400">Running…</p>
      ) : (
        <>
          <ul className="mt-1.5 space-y-1 text-sm">
            {ai.checks.map((c) => (
              <li key={c.id} className={tone(c.result)}>
                {icon(c.result)} {c.label}
                {c.note ? <span className="text-iron-500"> · {c.note}</span> : null}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-iron-400">
            {ai.summary}
            {ai.confidence !== undefined ? ` (confidence ${Math.round(ai.confidence * 100)}%)` : ""}
          </p>
        </>
      )}
    </div>
  );
}

function AttemptReview({ lift, index, attempt }: { lift: Lift; index: number; attempt: Attempt }) {
  const [reasons, setReasons] = useState<string[]>(attempt.reasons ?? []);
  const [note, setNote] = useState(attempt.note ?? "");
  const [err, setErr] = useState("");

  const toggle = (r: string) =>
    setReasons((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  function verdict(v: "good" | "no_lift") {
    setErr("");
    const e = getAccount().entry;
    if (!e) return;
    const res = reviewAttempt(e, lift, index, v, reasons, note);
    if ("error" in res) return setErr(res.error);
    saveEntry(res.entry);
  }

  const badge =
    attempt.status === "good"
      ? "bg-volt-400 text-iron-950 ring-volt-400"
      : attempt.status === "no_lift"
        ? "bg-blood-500 text-white ring-blood-500"
        : "bg-iron-800 text-iron-200 ring-iron-700";

  return (
    <div className="space-y-3 rounded-xl bg-iron-950 p-4 ring-1 ring-iron-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-2xl font-extrabold">
          {LIFT_LABEL[lift]} · attempt {index + 1} · {formatKg(attempt.weightKg)} kg
        </p>
        <span className={`chip ${badge}`}>
          {attempt.status === "submitted" ? "Needs review" : attempt.status === "good" ? "Good Lift" : "No Lift"}
        </span>
      </div>

      {attempt.videoId && <StoredVideo videoId={attempt.videoId} className="max-h-80" />}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-iron-400">
        {attempt.recording && (
          attempt.recording.source === "demo_skip" ? (
            <span className="chip bg-amber-300/15 text-amber-200 ring-amber-300/50">Demo clip (camera skipped)</span>
          ) : (
            <span className="chip bg-iron-900 text-volt-300 ring-iron-700">Natively Recorded</span>
          )
        )}
        {attempt.dots !== undefined && <span>DOTS {formatScore(attempt.dots)}</span>}
        {attempt.recording && (
          <span>
            {attempt.recording.durationSec}s · {attempt.recording.width ?? "?"}×{attempt.recording.height ?? "?"}
          </span>
        )}
      </div>

      <AiPanel lift={lift} ai={attempt.ai} />

      <fieldset className="space-y-1.5">
        <legend className="mb-1 text-[11px] font-bold uppercase tracking-stencil text-iron-500">
          If No Lift, why?
        </legend>
        {[...NO_LIFT_REASONS[lift], ...NO_LIFT_REASONS.video].map((r) => (
          <label key={r} className="flex cursor-pointer items-start gap-2 text-sm text-iron-300">
            <input
              type="checkbox"
              checked={reasons.includes(r)}
              onChange={() => toggle(r)}
              className="mt-1 accent-[#a3e635]"
            />
            {r}
          </label>
        ))}
      </fieldset>

      <input
        className="field"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note for the lifter"
        aria-label="Judge note"
      />
      {err && (
        <p role="alert" className="text-xs font-medium text-blood-400">
          {err}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-volt !py-2 text-sm" onClick={() => verdict("good")}>
          <CheckCircle2 className="h-4 w-4" /> Good Lift
        </button>
        <button type="button" className="btn-ghost !py-2 text-sm !text-blood-400" onClick={() => verdict("no_lift")}>
          <XCircle className="h-4 w-4" /> No Lift
        </button>
      </div>
    </div>
  );
}
