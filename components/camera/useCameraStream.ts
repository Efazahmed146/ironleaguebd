"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraError = "unsupported" | "insecure" | "denied" | "not_found" | "busy" | "other";

export const CAMERA_ERROR_TEXT: Record<CameraError, string> = {
  unsupported: "This browser can't use the camera. Try Chrome or Safari on your phone.",
  insecure: "Phones only allow the camera on a secure page (https), and this page is plain http. Open the site through an https link (see SETUP-SUPABASE.md, \"Camera on your phone\").",
  denied: "Camera permission is blocked. Allow camera and microphone for this site in your browser settings, then try again.",
  not_found: "No camera was found on this device.",
  busy: "The camera is being used by another app. Close it and try again.",
  other: "Couldn't start the camera. Try again.",
};

function classify(e: unknown): CameraError {
  const name = (e as { name?: string })?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "not_found";
  if (name === "NotReadableError" || name === "AbortError") return "busy";
  return "other";
}

/** Opens the live camera while `active` is true and releases it afterwards. */
export function useCameraStream(active: boolean, opts: { audio: boolean }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<CameraError | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [attempt, setAttempt] = useState(0);
  const live = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError(window.isSecureContext ? "unsupported" : "insecure");
      return;
    }

    (async () => {
      const video: MediaTrackConstraints = {
        facingMode: { ideal: facing },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };
      try {
        let s: MediaStream;
        try {
          s = await navigator.mediaDevices.getUserMedia({ video, audio: opts.audio });
        } catch (e) {
          // No microphone? still allow a silent clip.
          if (opts.audio && classify(e) === "not_found") {
            s = await navigator.mediaDevices.getUserMedia({ video, audio: false });
          } else throw e;
        }
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        live.current = s;
        setStream(s);
      } catch (e) {
        if (!cancelled) setError(classify(e));
      }
    })();

    return () => {
      cancelled = true;
      live.current?.getTracks().forEach((t) => t.stop());
      live.current = null;
      setStream(null);
    };
  }, [active, facing, attempt, opts.audio]);

  const flip = useCallback(() => setFacing((f) => (f === "environment" ? "user" : "environment")), []);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { stream, error, facing, flip, retry };
}
