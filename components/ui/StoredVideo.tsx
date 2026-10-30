"use client";

import { useEffect, useState } from "react";
import { getVideo } from "@/lib/video-store";

/** Plays a video saved in this browser's IndexedDB (demo storage). */
export function StoredVideo({ videoId, className = "" }: { videoId: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    getVideo(videoId)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) return setMissing(true);
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setMissing(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [videoId]);

  if (missing) return <p className="text-xs text-iron-500">Video not found on this device.</p>;
  if (!url) return <div className={`h-40 animate-pulse-glow rounded-lg bg-iron-900 ${className}`} />;
  return <video src={url} controls playsInline className={`w-full rounded-lg bg-black ${className}`} />;
}
