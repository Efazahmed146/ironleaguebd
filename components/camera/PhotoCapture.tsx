"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, X } from "lucide-react";
import { MEET } from "@/lib/meet";
import { makeDemoPhoto } from "@/lib/demo-media";
import { CAMERA_ERROR_TEXT, useCameraStream } from "./useCameraStream";

export interface CapturedPhoto {
  dataUrl: string;
  takenAt: string;
  /** DEMO ONLY: the camera was skipped. */
  demo?: boolean;
}

/**
 * Live camera photo for the weigh-in. The date, time and your code are burned
 * into the image, and there is no gallery option.
 */
export function PhotoCapture({
  code,
  onCapture,
  onClose,
}: {
  code: string;
  onCapture: (p: CapturedPhoto) => void;
  onClose: () => void;
}) {
  const { stream, error, flip, retry } = useCameraStream(true, { audio: false });
  const ref = useRef<HTMLVideoElement>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const v = ref.current;
    if (v && stream) {
      v.srcObject = stream;
      v.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const stamp = (d: Date) =>
    d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  function skip() {
    onCapture({ dataUrl: makeDemoPhoto(code), takenAt: new Date().toISOString(), demo: true });
  }

  function snap() {
    const v = ref.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
    const w = Math.round(v.videoWidth * scale);
    const h = Math.round(v.videoHeight * scale);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);
    const taken = new Date();
    const bar = Math.max(30, Math.round(h * 0.07));
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, h - bar, w, bar);
    ctx.fillStyle = "#a3e635";
    ctx.font = `bold ${Math.round(bar * 0.5)}px sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(`IRONLEAGUE BD · ${stamp(taken)} · CODE ${code}`, 12, h - bar / 2);
    onCapture({ dataUrl: c.toDataURL("image/jpeg", 0.85), takenAt: taken.toISOString() });
  }

  return (
    <div data-theme="dark" role="dialog" aria-modal="true" aria-label="Weigh-in photo" className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="font-display text-xl font-extrabold uppercase">Weigh-in photo</p>
        <button type="button" onClick={onClose} aria-label="Close camera" className="rounded-full bg-white/10 p-2 hover:bg-white/20">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1 bg-iron-950">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <Camera className="h-10 w-10 text-blood-400" />
            <p className="max-w-sm text-sm text-white/80">{CAMERA_ERROR_TEXT[error]}</p>
            <button type="button" onClick={retry} className="btn-volt">
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
            {MEET.demoSkips && (
              <button type="button" onClick={skip} className="btn-ghost">
                Skip camera (demo only)
              </button>
            )}
          </div>
        ) : (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video ref={ref} muted playsInline autoPlay className="h-full w-full object-contain" />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2 text-center text-sm font-bold text-volt-300">
          {stamp(now)} · CODE {code}
        </div>
      </div>
      <div className="space-y-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-center">
        <p className="text-xs text-white/60">
          Show yourself on the scale, the full display and the paper with code {code}.
        </p>
        <div className="flex items-center justify-center gap-6">
          <button type="button" onClick={flip} className="btn-ghost !py-2 text-sm">Flip</button>
          <button type="button" onClick={snap} disabled={!stream} aria-label="Take photo" className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white disabled:opacity-40">
            <span className="h-11 w-11 rounded-full bg-white" />
          </button>
          <span className="w-14" />
        </div>
        {MEET.demoSkips && (
          <button type="button" onClick={skip} className="text-xs font-semibold text-white/60 underline hover:text-white">
            Skip camera (demo only)
          </button>
        )}
      </div>
    </div>
  );
}
