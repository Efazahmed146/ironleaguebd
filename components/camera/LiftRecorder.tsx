"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, RefreshCw, RotateCcw, Square, SwitchCamera, X } from "lucide-react";
import type { Lift } from "@/lib/types";
import { LIFT_LABEL, MEET, MIN_CLIP_SEC, type Recording } from "@/lib/meet";
import { makeDemoClip } from "@/lib/demo-media";
import { CAMERA_GUIDE } from "@/lib/camera-guide";
import { formatKg, formatScore } from "@/lib/format";
import { CAMERA_ERROR_TEXT, useCameraStream } from "./useCameraStream";
import { GuideOverlay } from "./GuideOverlay";

export const MAX_CLIP_SEC = 90;

export interface RecordedClip {
  blob: Blob;
  recording: Recording;
}

function pickMime(): string {
  const list = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4",
  ];
  if (typeof MediaRecorder === "undefined") return "";
  return list.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

type Phase = "live" | "countdown" | "recording" | "review";

/**
 * Full-screen in-app recorder. The only way to get a video into an attempt:
 * there is no file picker anywhere. Output is a Blob handed to `onSubmit`.
 */
export function LiftRecorder({
  lift,
  weightKg,
  dots,
  onSubmit,
  onClose,
  busy,
  submitError,
}: {
  lift: Lift;
  weightKg: number;
  /** DOTS preview for the declared weight. */
  dots: number;
  onSubmit: (clip: RecordedClip) => void;
  onClose: () => void;
  busy: boolean;
  submitError: string;
}) {
  const [phase, setPhase] = useState<Phase>("live");
  const { stream, error, flip, retry } = useCameraStream(phase !== "review", { audio: true });
  const [count, setCount] = useState(5);
  const [elapsed, setElapsed] = useState(0);
  const [clip, setClip] = useState<RecordedClip | null>(null);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [skipping, setSkipping] = useState(false);

  const liveRef = useRef<HTMLVideoElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const guide = CAMERA_GUIDE[lift];

  useEffect(() => {
    const v = liveRef.current;
    if (v && stream) {
      v.srcObject = stream;
      v.play().catch(() => {});
    }
  }, [stream, phase]);

  useEffect(() => {
    if (!clip) return setClipUrl(null);
    const u = URL.createObjectURL(clip.blob);
    setClipUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [clip]);

  // lock page scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const stop = useCallback(() => {
    const r = recorder.current;
    if (r && r.state !== "inactive") r.stop();
  }, []);

  const startRecording = useCallback(() => {
    if (!stream) return;
    if (typeof MediaRecorder === "undefined") {
      setNotice("This browser can't record video. Use Chrome or Safari 14.1+.");
      setPhase("live");
      return;
    }
    const mimeType = pickMime();
    chunks.current = [];
    let r: MediaRecorder;
    try {
      r = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 2_500_000 } : undefined);
    } catch {
      setNotice("Couldn't start recording on this device.");
      setPhase("live");
      return;
    }
    recorder.current = r;
    r.ondataavailable = (e) => {
      if (e.data.size) chunks.current.push(e.data);
    };
    r.onstop = () => {
      const durationSec = Math.round(((performance.now() - startedAt.current) / 1000) * 10) / 10;
      const type = r.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunks.current, { type });
      const settings = stream.getVideoTracks()[0]?.getSettings();
      if (blob.size === 0) {
        setNotice("Nothing was recorded. Try again.");
        setPhase("live");
        return;
      }
      setClip({
        blob,
        recording: {
          source: "in_app_camera",
          mimeType: type,
          durationSec,
          width: settings?.width,
          height: settings?.height,
          sizeBytes: blob.size,
          recordedAt: new Date().toISOString(),
        },
      });
      setPhase("review");
    };
    startedAt.current = performance.now();
    setElapsed(0);
    r.start(1000);
    setPhase("recording");
  }, [stream]);

  // countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) {
      startRecording();
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, count, startRecording]);

  // timer + auto stop
  useEffect(() => {
    if (phase !== "recording") return;
    const t = setInterval(() => {
      const s = (performance.now() - startedAt.current) / 1000;
      setElapsed(s);
      if (s >= MAX_CLIP_SEC) stop();
    }, 200);
    return () => clearInterval(t);
  }, [phase, stop]);

  // never leave a recorder running on unmount
  useEffect(
    () => () => {
      const r = recorder.current;
      if (r && r.state !== "inactive") {
        r.onstop = null;
        r.stop();
      }
    },
    [],
  );

  function begin() {
    setNotice("");
    setCount(5);
    setPhase("countdown");
  }

  /** DEMO ONLY: skip the camera and use a labelled placeholder clip. */
  async function skipCamera() {
    setNotice("");
    setSkipping(true);
    try {
      const { blob, durationSec } = await makeDemoClip(`${LIFT_LABEL[lift]} · ${weightKg} kg`);
      setClip({
        blob,
        recording: {
          source: "demo_skip",
          mimeType: blob.type,
          durationSec,
          sizeBytes: blob.size,
          recordedAt: new Date().toISOString(),
        },
      });
      setPhase("review");
    } catch {
      setNotice("Couldn't create the demo clip.");
    } finally {
      setSkipping(false);
    }
  }

  function cancelCountdown() {
    setPhase("live");
  }

  function retake() {
    setClip(null);
    setNotice("");
    setPhase("live");
  }

  const mm = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const tooShort = clip ? clip.recording.durationSec < MIN_CLIP_SEC : false;

  return (
    <div data-theme="dark" role="dialog" aria-modal="true" aria-label={`Record ${LIFT_LABEL[lift]} attempt`} className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
      {/* top bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="font-display text-xl font-extrabold uppercase leading-none">
            {LIFT_LABEL[lift]} · {formatKg(weightKg)} kg
          </p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-white/60">
            Recorded live in the app · DOTS {formatScore(dots)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={phase === "recording" || busy}
          aria-label="Close camera"
          className="rounded-full bg-white/10 p-2 hover:bg-white/20 disabled:opacity-40"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* viewport */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-iron-950">
        {phase !== "review" && (
          <>
            {error ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
                <Camera className="h-10 w-10 text-blood-400" />
                <p className="max-w-sm text-sm text-white/80">{CAMERA_ERROR_TEXT[error]}</p>
                <button type="button" onClick={retry} className="btn-volt">
                  <RefreshCw className="h-4 w-4" /> Try again
                </button>
                {MEET.demoSkips && (
                  <button type="button" onClick={skipCamera} disabled={skipping} className="btn-ghost">
                    {skipping ? "Creating demo clip…" : "Skip camera (demo only)"}
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video ref={liveRef} muted playsInline autoPlay className="h-full w-full object-contain" />
                {!stream && (
                  <p className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
                    Starting camera…
                  </p>
                )}
                <GuideOverlay lift={lift} />
              </>
            )}

            {phase === "countdown" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                <p className="font-display text-[10rem] font-black leading-none text-volt-400">{count || "GO"}</p>
                <p className="text-sm text-white/80">Get under the bar. Recording starts automatically.</p>
              </div>
            )}

            {phase === "recording" && (
              <div className="absolute left-3 top-8 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-sm font-bold tabular-nums">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blood-500" />
                REC {mm(elapsed)} <span className="text-white/50">/ {mm(MAX_CLIP_SEC)}</span>
              </div>
            )}
          </>
        )}

        {phase === "review" && clipUrl && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={clipUrl} controls playsInline className="h-full w-full object-contain" />
        )}
      </div>

      {/* bottom controls */}
      <div className="space-y-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {phase === "live" && !error && (
          <>
            <ul className="space-y-0.5 text-center text-[11px] text-white/60">
              {guide.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            {notice && <p role="alert" className="text-center text-sm text-blood-400">{notice}</p>}
            <div className="flex items-center justify-center gap-6">
              <button type="button" onClick={flip} aria-label="Switch camera" className="rounded-full bg-white/10 p-3 hover:bg-white/20">
                <SwitchCamera className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={begin}
                disabled={!stream}
                className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white disabled:opacity-40"
                aria-label="Start recording (5 second countdown)"
              >
                <span className="h-11 w-11 rounded-full bg-blood-500" />
              </button>
              <span className="w-11" />
            </div>
            {MEET.demoSkips && (
              <div className="text-center">
                <button type="button" onClick={skipCamera} disabled={skipping} className="text-xs font-semibold text-white/60 underline hover:text-white">
                  {skipping ? "Creating demo clip…" : "Skip camera (demo only)"}
                </button>
              </div>
            )}
          </>
        )}

        {phase === "countdown" && (
          <div className="flex justify-center">
            <button type="button" onClick={cancelCountdown} className="btn-ghost">Cancel</button>
          </div>
        )}

        {phase === "recording" && (
          <div className="flex justify-center">
            <button type="button" onClick={stop} className="flex items-center gap-2 rounded-full bg-blood-500 px-6 py-3 font-bold uppercase tracking-wide">
              <Square className="h-4 w-4 fill-current" /> Stop
            </button>
          </div>
        )}

        {phase === "review" && clip && (
          <>
            <p className="text-center text-xs text-white/70">
              {clip.recording.source === "demo_skip"
                ? "DEMO clip (camera skipped). A moderator will see it's not a real lift. "
                : "Check that the bar, plates and your whole body are visible. "}
              {formatKg(weightKg)} kg · {mm(clip.recording.durationSec)} · {(clip.recording.sizeBytes / 1048576).toFixed(1)} MB
            </p>
            {tooShort && (
              <p role="alert" className="text-center text-sm text-blood-400">
                Too short: a lift needs at least {MIN_CLIP_SEC} seconds. Retake it.
              </p>
            )}
            {submitError && <p role="alert" className="text-center text-sm text-blood-400">{submitError}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={retake} disabled={busy} className="btn-ghost flex-1 justify-center">
                <RotateCcw className="h-4 w-4" /> Retake
              </button>
              <button
                type="button"
                onClick={() => onSubmit(clip)}
                disabled={busy || tooShort}
                className="btn-volt flex-1 justify-center"
              >
                <Check className="h-4 w-4" /> {busy ? "Submitting…" : "Submit lift"}
              </button>
            </div>
            <p className="text-center text-[11px] text-white/50">
              After you submit, the weight is locked and the clip goes to the review queue.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
