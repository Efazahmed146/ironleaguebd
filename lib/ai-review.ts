import type { Lift } from "./types";

/**
 * AI form pre-check pipeline (advisory only: a moderator always makes the final call).
 *
 *  1. The app records the lift with the in-app camera.
 *  2. `extractFrames` pulls evenly spaced stills from the clip (in the browser).
 *  3. `runAiReview` sends the stills to your AI endpoint (a Supabase Edge Function,
 *     see supabase/functions/ai-review) which returns pass / fail / unclear per check.
 *  4. The result is attached to the attempt and shown to the moderator.
 *
 * If NEXT_PUBLIC_AI_REVIEW_URL is not set, no AI runs: every check is marked
 * "unclear" and the attempt simply goes to the moderator. We never invent a verdict.
 */

export type CheckResult = "pass" | "fail" | "unclear";

export interface AiCheck {
  id: string;
  label: string;
  result: CheckResult;
  note?: string;
}

export interface AiReview {
  /** "done" = the AI ran; "unavailable" = not connected; "error" = call failed. */
  status: "done" | "unavailable" | "error";
  checks: AiCheck[];
  summary: string;
  /** 0–1, as reported by the model. */
  confidence?: number;
  model?: string;
  reviewedAt: string;
}

/** The form checks per lift. `reason` matches the moderator's No Lift reasons. */
export const AI_CHECKS: Record<Lift, { id: string; label: string; reason: string }[]> = {
  squat: [
    {
      id: "depth",
      label: "Hip crease goes below the top of the knee",
      reason: "Depth not reached (hip crease above knee)",
    },
    {
      id: "lockout",
      label: "Stands back up to locked knees and hips",
      reason: "Did not reach full lockout",
    },
  ],
  bench: [
    {
      id: "pause",
      label: "Clear pause with the bar on the chest",
      reason: "No visible pause on the chest",
    },
    {
      id: "lockout",
      label: "Full, even arm lockout",
      reason: "Uneven or incomplete lockout",
    },
  ],
  deadlift: [
    {
      id: "lockout",
      label: "Hips and knees fully locked at the top",
      reason: "Incomplete lockout (knees / shoulders)",
    },
    {
      id: "shoulders",
      label: "Shoulders pulled back",
      reason: "Incomplete lockout (knees / shoulders)",
    },
  ],
};

export function unavailableReview(lift: Lift, summary: string, status: AiReview["status"] = "unavailable"): AiReview {
  return {
    status,
    checks: AI_CHECKS[lift].map((c) => ({ id: c.id, label: c.label, result: "unclear", note: "Not checked" })),
    summary,
    reviewedAt: new Date().toISOString(),
  };
}

/* ---------------- frame extraction (runs in the browser) ---------------- */

function seekTo(video: HTMLVideoElement, t: number): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      video.removeEventListener("seeked", onSeeked);
      clearTimeout(timer);
      resolve(ok);
    };
    const onSeeked = () => done(true);
    const timer = setTimeout(() => done(false), 2500);
    video.addEventListener("seeked", onSeeked);
    video.currentTime = t;
  });
}

/**
 * Returns up to `count` evenly spaced JPEG data URLs from a recorded clip.
 * `durationSec` comes from the recorder (browser-recorded WebM files often report an
 * infinite duration, so we don't trust the media element for it).
 */
export async function extractFrames(
  blob: Blob,
  durationSec: number,
  count = 10,
  maxWidth = 640,
): Promise<string[]> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Couldn't read the recording."));
    });

    const w = Math.min(maxWidth, video.videoWidth || maxWidth);
    const h = Math.round(w * ((video.videoHeight || 9) / (video.videoWidth || 16)));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    const frames: string[] = [];
    const last = Math.max(0.1, durationSec - 0.15);
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : (i / (count - 1)) * last;
      if (!(await seekTo(video, t))) continue;
      ctx.drawImage(video, 0, 0, w, h);
      frames.push(canvas.toDataURL("image/jpeg", 0.7));
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ---------------- calling the AI endpoint ---------------- */

export async function runAiReview(lift: Lift, frames: string[], weightKg: number): Promise<AiReview> {
  const endpoint = process.env.NEXT_PUBLIC_AI_REVIEW_URL;
  if (!endpoint) {
    return unavailableReview(lift, "AI pre-check isn't connected yet. This attempt goes straight to a moderator.");
  }
  if (frames.length === 0) {
    return unavailableReview(lift, "Couldn't extract frames from the video. A moderator will review it.", "error");
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lift, weightKg, frames }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Partial<AiReview>;

    const checks = AI_CHECKS[lift].map((c) => {
      const got = data.checks?.find((x) => x.id === c.id);
      const result = got?.result === "pass" || got?.result === "fail" ? got.result : "unclear";
      return { id: c.id, label: c.label, result, note: got?.note } as AiCheck;
    });
    return {
      status: "done",
      checks,
      summary: data.summary ?? "",
      confidence: typeof data.confidence === "number" ? data.confidence : undefined,
      model: data.model,
      reviewedAt: new Date().toISOString(),
    };
  } catch {
    return unavailableReview(lift, "The AI pre-check failed. A moderator will review it.", "error");
  }
}
