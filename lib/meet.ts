import type { Experience, Lift } from "./types";
import type { AiReview } from "./ai-review";

/* ---------- Meet configuration (edit these for each event) ---------- */

interface MeetConfig {
  id: string;
  name: string;
  /** Entry fee in BDT. Set to 0 for a free meet. */
  entryFeeBdt: number;
  /** Where lifters send the fee (replace with your real numbers). */
  payTo: { bkash: string; nagad: string };
  /** True once results are final (results stop saying "Provisional"). */
  closed: boolean;
  /** DEMO ONLY moderator PIN. Replaced by real admin roles when Supabase is connected. */
  adminPin: string;
  /**
   * DEMO ONLY. Shows "Skip (demo)" buttons so testers can move past the camera, the
   * subscription, the entry fee, the weigh-in approval and the judging. Skipped items are
   * tagged as demo. Set to false for real meets (and turn demo_mode off in the database).
   */
  demoSkips: boolean;
}

export const MEET: MeetConfig = {
  id: "season-01-open",
  name: "IronLeague BD · Season 01 Open",
  entryFeeBdt: 300,
  payTo: { bkash: "01XXXXXXXXX", nagad: "01XXXXXXXXX" },
  closed: false,
  adminPin: "1234",
  demoSkips: true,
};

/* ---------- Types ---------- */

export type ReviewStatus = "pending" | "approved" | "rejected";
export type AttemptStatus = "declared" | "submitted" | "good" | "no_lift";

/** How a clip was captured. Only the in-app camera is accepted. */
export interface Recording {
  source: "in_app_camera" | "demo_skip";
  mimeType: string;
  durationSec: number;
  width?: number;
  height?: number;
  sizeBytes: number;
  recordedAt: string;
}

export interface Attempt {
  weightKg: number;
  status: AttemptStatus;
  /** Recorded clip (IndexedDB key). */
  videoId?: string;
  recording?: Recording;
  /** DOTS of this lift at submission: declared weight vs. bodyweight. */
  dots?: number;
  /** Advisory AI form pre-check. */
  ai?: AiReview;
  submittedAt?: string;
  /** Moderator's reasons for a No Lift. */
  reasons?: string[];
  note?: string;
  reviewedAt?: string;
}

export interface WeighIn {
  measuredKg: number;
  /** Code the lifter had to show on paper in the photo. */
  code: string;
  /** Photo taken with the in-app camera (date, time and code are burned into it). */
  photoDataUrl?: string;
  photoTakenAt?: string;
  source?: "in_app_camera" | "demo_skip";
  submittedAt: string;
  status: ReviewStatus;
  note?: string;
}

export interface Payment {
  /** "gateway" = paid online through SSLCommerz (confirmed automatically). */
  method: "bkash" | "nagad" | "gateway";
  senderNumber?: string;
  /** Bank / wallet transaction id (gateway payments) or the TrxID typed by the lifter. */
  trxId: string;
  /** Our own order id for gateway payments. */
  tranId?: string;
  /** How they paid at the gateway, e.g. "BKASH-BKash". */
  channel?: string;
  amountBdt: number;
  submittedAt: string;
  status: ReviewStatus;
  note?: string;
}

export interface MeetEntry {
  meetId: string;
  experience: Experience;
  /** IPF class code, e.g. "-83". */
  weightClass: string;
  registeredAt: string;
  weighInCode: string;
  weighIn?: WeighIn;
  payment?: Payment;
  attempts: Record<Lift, Attempt[]>;
}

/* ---------- Constants ---------- */

export const LIFTS: Lift[] = ["squat", "bench", "deadlift"];
export const LIFT_LABEL: Record<Lift, string> = {
  squat: "Squat",
  bench: "Bench Press",
  deadlift: "Deadlift",
};
export const MAX_ATTEMPTS = 3;
export const MIN_JUMP_KG = 2.5;
const LIFT_CAP: Record<Lift, number> = { squat: 500, bench: 350, deadlift: 500 };

/* ---------- Entry helpers ---------- */

export function newEntry(experience: Experience, weightClass: string): MeetEntry {
  return {
    meetId: MEET.id,
    experience,
    weightClass,
    registeredAt: new Date().toISOString(),
    weighInCode: String(Math.floor(1000 + Math.random() * 9000)),
    attempts: { squat: [], bench: [], deadlift: [] },
  };
}

export const feeRequired = () => MEET.entryFeeBdt > 0;

/** May start lifting: weigh-in sent (not rejected) and fee sent (if any). */
export function canLift(e: MeetEntry): boolean {
  if (MEET.demoSkips) return true; // DEMO: attempts are never locked behind weigh-in / fee
  if (!e.weighIn || e.weighIn.status === "rejected") return false;
  if (feeRequired() && (!e.payment || e.payment.status === "rejected")) return false;
  return true;
}

/** Weigh-in approved and fee confirmed → results are official. */
export function isOfficial(e: MeetEntry): boolean {
  if (e.weighIn?.status !== "approved") return false;
  return !feeRequired() || e.payment?.status === "approved";
}

/** Heaviest attempt a moderator marked "good". */
export function bestGood(e: MeetEntry, lift: Lift): number {
  return e.attempts[lift].reduce((m, a) => (a.status === "good" ? Math.max(m, a.weightKg) : m), 0);
}

export function entryLifts(e: MeetEntry) {
  return {
    squatKg: bestGood(e, "squat"),
    benchKg: bestGood(e, "bench"),
    deadliftKg: bestGood(e, "deadlift"),
  };
}

export function collectVideoIds(e: MeetEntry | null): string[] {
  if (!e) return [];
  const ids: string[] = [];
  LIFTS.forEach((l) => e.attempts[l].forEach((a) => a.videoId && ids.push(a.videoId)));
  return ids;
}

/* ---------- 3-attempt rules ---------- */

export type Result = { entry: MeetEntry } | { error: string };

/** Validates a declared weight against the lifter's previous attempts. */
export function checkWeight(base: Attempt[], weightKg: number, lift: Lift): string | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return "Enter a weight.";
  if (weightKg > LIFT_CAP[lift]) return `Maximum is ${LIFT_CAP[lift]} kg.`;
  if (Math.abs(weightKg * 2 - Math.round(weightKg * 2)) > 1e-9) return "Use steps of 0.5 kg.";

  const last = base[base.length - 1];
  if (last) {
    if (last.status === "declared" || last.status === "submitted") {
      return "Wait until your previous attempt is reviewed.";
    }
    if (last.status === "good" && weightKg < last.weightKg + MIN_JUMP_KG) {
      return `After a Good Lift, go up at least ${MIN_JUMP_KG} kg (minimum ${last.weightKg + MIN_JUMP_KG} kg).`;
    }
    if (last.status === "no_lift" && weightKg < last.weightKg) {
      return `Weights can only go up. Minimum is ${last.weightKg} kg.`;
    }
  }
  return null;
}

/** Declare the next attempt, or change the weight of one not yet submitted. */
export function declareAttempt(entry: MeetEntry, lift: Lift, weightKg: number): Result {
  const list = entry.attempts[lift];
  const last = list[list.length - 1];
  const editing = last?.status === "declared";
  if (!editing && list.length >= MAX_ATTEMPTS) {
    return { error: "All 3 attempts used for this lift." };
  }
  const base = editing ? list.slice(0, -1) : list;
  const error = checkWeight(base, weightKg, lift);
  if (error) return { error };

  const attempt: Attempt = editing ? { ...last!, weightKg } : { weightKg, status: "declared" };
  return { entry: { ...entry, attempts: { ...entry.attempts, [lift]: [...base, attempt] } } };
}

export const MIN_CLIP_SEC = 3;

/** Lock the declared attempt by attaching its in-app recording. After this the weight can't change. */
export function submitAttempt(
  entry: MeetEntry,
  lift: Lift,
  media: { videoId: string; recording: Recording; dots?: number; ai?: AiReview },
): Result {
  const list = entry.attempts[lift];
  const last = list[list.length - 1];
  if (!last || last.status !== "declared") return { error: "Declare the attempt weight first." };
  const src = media.recording.source;
  if (src !== "in_app_camera" && !(src === "demo_skip" && MEET.demoSkips)) {
    return { error: "Videos must be recorded with the in-app camera." };
  }
  if (media.recording.durationSec < MIN_CLIP_SEC) {
    return { error: `Recording is too short (at least ${MIN_CLIP_SEC} seconds).` };
  }

  const done: Attempt = {
    ...last,
    videoId: media.videoId,
    recording: media.recording,
    dots: media.dots,
    ai: media.ai,
    status: "submitted",
    submittedAt: new Date().toISOString(),
  };
  return {
    entry: { ...entry, attempts: { ...entry.attempts, [lift]: [...list.slice(0, -1), done] } },
  };
}

/** Attach the (late-arriving) AI pre-check to a submitted attempt. */
export function attachAiReview(entry: MeetEntry, lift: Lift, index: number, ai: AiReview): MeetEntry | null {
  const list = entry.attempts[lift];
  const a = list[index];
  if (!a || a.status === "declared") return null;
  const copy = list.slice();
  copy[index] = { ...a, ai };
  return { ...entry, attempts: { ...entry.attempts, [lift]: copy } };
}

/** Moderator verdict on one attempt. */
export function reviewAttempt(
  entry: MeetEntry,
  lift: Lift,
  index: number,
  verdict: "good" | "no_lift",
  reasons: string[],
  note?: string,
): Result {
  const list = entry.attempts[lift];
  const a = list[index];
  if (!a || a.status === "declared") return { error: "This attempt has no video yet." };
  if (verdict === "no_lift" && reasons.length === 0) {
    return { error: "Pick at least one reason for a No Lift." };
  }
  const next: Attempt = {
    ...a,
    status: verdict,
    reasons: verdict === "no_lift" ? reasons : undefined,
    note: note?.trim() || undefined,
    reviewedAt: new Date().toISOString(),
  };
  const copy = list.slice();
  copy[index] = next;
  return { entry: { ...entry, attempts: { ...entry.attempts, [lift]: copy } } };
}

/* ---------- DEMO shortcuts (only when MEET.demoSkips) ---------- */

/** Short text for a payment, e.g. "৳300 via bKash". */
export function paymentLabel(p: Payment): string {
  const how =
    p.method === "gateway"
      ? p.channel
        ? p.channel.split("-").pop()!.trim() || "online payment"
        : "online payment"
      : p.method === "bkash"
        ? "bKash"
        : "Nagad";
  return `৳${p.amountBdt} via ${how}`;
}

/**
 * Records an entry fee that the SERVER confirmed with the payment gateway (a row in
 * public.entry_payments with status "paid"). This unlocks the next step.
 */
export function applyGatewayPayment(
  entry: MeetEntry,
  paid: { tranId: string; amountBdt: number; channel?: string | null; bankTranId?: string | null; paidAt?: string | null },
): MeetEntry {
  return {
    ...entry,
    payment: {
      method: "gateway",
      trxId: paid.bankTranId || paid.tranId,
      tranId: paid.tranId,
      channel: paid.channel ?? undefined,
      amountBdt: paid.amountBdt,
      submittedAt: paid.paidAt ?? new Date().toISOString(),
      status: "approved",
      note: "Paid online",
    },
  };
}

/** Marks the entry fee as paid without a real payment. */
export function demoPay(entry: MeetEntry): MeetEntry {
  const now = new Date().toISOString();
  return {
    ...entry,
    payment: {
      method: entry.payment?.method ?? "bkash",
      senderNumber: entry.payment?.senderNumber ?? "01000000000",
      trxId: entry.payment?.trxId ?? `DEMO${Date.now().toString(36).toUpperCase()}`,
      amountBdt: MEET.entryFeeBdt,
      submittedAt: entry.payment?.submittedAt ?? now,
      status: "approved",
      note: "Demo: skipped",
    },
  };
}

/** Approves a submitted weigh-in as if a moderator did. */
export function demoApproveWeighIn(entry: MeetEntry): MeetEntry {
  return entry.weighIn ? { ...entry, weighIn: { ...entry.weighIn, status: "approved" } } : entry;
}

/** Judges a submitted attempt Good Lift as if a moderator did (unlocks the next attempt). */
export function demoJudgeGood(entry: MeetEntry, lift: Lift, index: number): Result {
  return reviewAttempt(entry, lift, index, "good", [], "Demo: auto-judged");
}

/** DEMO: gives every lift a Good Lift so results and the Flex Card can be tried. */
export function demoFillResults(entry: MeetEntry, sex: "M" | "F"): MeetEntry {
  const now = new Date().toISOString();
  const kg: Record<Lift, number> = sex === "F" ? { squat: 90, bench: 50, deadlift: 110 } : { squat: 150, bench: 100, deadlift: 180 };
  const attempts = { ...entry.attempts };
  (["squat", "bench", "deadlift"] as Lift[]).forEach((l) => {
    if (bestGood(entry, l) > 0) return;
    attempts[l] = [
      ...entry.attempts[l].filter((a) => a.status === "good" || a.status === "no_lift"),
      { weightKg: kg[l], status: "good", submittedAt: now, reviewedAt: now, note: "Demo: auto-filled" },
    ].slice(0, MAX_ATTEMPTS);
  });
  return demoApproveWeighIn(demoPay({ ...entry, attempts }));
}

/* ---------- Lift standards & judging reasons ---------- */

export const LIFT_STANDARDS: Record<Lift, { title: string; rules: string[]; angle: string }> = {
  squat: {
    title: "Squat: parallel depth",
    rules: [
      "Bar rests on your back. Unrack, step back and stand upright with knees locked before you start.",
      "Squat down to parallel or below: the hip joint (crease of the hip) must go LOWER than the top of the knee.",
      "Return to fully upright with knees and hips locked. No double bounce or downward movement on the way up.",
      "Stand still for a second at the top before racking.",
    ],
    angle: "Film from the side or a 45° front-side angle so depth is clearly visible.",
  },
  bench: {
    title: "Bench press: contact, pause, lockout",
    rules: [
      "Head, shoulders and buttocks stay in contact with the bench for the whole lift. Feet flat on the floor.",
      "Lower the bar to your chest and hold it motionless for a clear pause (about 1 second) before pressing.",
      "Press to full lockout of both elbows, evenly.",
      "No bouncing off the chest and no pressing down once the press has started.",
    ],
    angle: "Film from the side so the chest touch, your bum and your feet are all visible.",
  },
  deadlift: {
    title: "Deadlift: erect and locked out",
    rules: [
      "Lift the bar from the floor, conventional or sumo stance, to a fully erect standing position.",
      "Knees locked and shoulders pulled back at the top. Hold for a second.",
      "No downward movement of the bar during the pull, and the bar must not rest on your thighs (no hitching).",
      "Lower the bar under control. Don't drop it.",
    ],
    angle: "Film from the side so the whole body, the bar and the plates are in frame.",
  },
};

export const VIDEO_RULES = [
  "Record every attempt LIVE with the in-app camera. Gallery, downloaded or pre-recorded videos are prohibited, and the app has no upload option.",
  "ONE continuous take per attempt. You can retake before submitting, but you can't edit, trim or speed it up.",
  "The loaded barbell and every plate must be clearly visible and readable (show them before you lift).",
  "Your whole body and the bar stay in frame from start to finish.",
  "Use a standard 20 kg bar and calibrated plates, with collars on.",
  "Record in good light with the phone on a tripod or a stable surface.",
  "The weight you declared must match the weight on the bar.",
];

export const NO_LIFT_REASONS: Record<Lift | "video", string[]> = {
  squat: [
    "Depth not reached (hip crease above knee)",
    "Did not reach full lockout",
    "Double bounce / downward movement while standing up",
    "Did not stand upright before starting",
  ],
  bench: [
    "No visible pause on the chest",
    "Head / shoulders / buttocks left the bench",
    "Feet moved or lifted off the floor",
    "Uneven or incomplete lockout",
    "Bar pressed down during the press",
  ],
  deadlift: [
    "Incomplete lockout (knees / shoulders)",
    "Downward movement during the lift",
    "Bar rested on thighs (hitching)",
    "Dropped the bar before finishing",
  ],
  video: [
    "Video is cut, edited or not one continuous take",
    "Plates / weight not clearly visible",
    "Lifter or bar out of frame",
    "Weight doesn't match the declared attempt",
  ],
};
