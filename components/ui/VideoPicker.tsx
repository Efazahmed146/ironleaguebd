"use client";

import { useEffect, useState } from "react";
import { Link2, Upload } from "lucide-react";
import { Segmented } from "./Segmented";

export interface VideoValue {
  file: File | null;
  link: string;
}

export const EMPTY_VIDEO: VideoValue = { file: null, link: "" };

/** Returns an error message, or null when the value is a usable video. */
export function validateVideo(v: VideoValue, maxMb = 300): string | null {
  if (v.file) {
    if (!v.file.type.startsWith("video/")) return "That file isn't a video.";
    if (v.file.size > maxMb * 1024 * 1024) return `Video is too large (max ${maxMb} MB).`;
    return null;
  }
  if (v.link.trim()) {
    try {
      const u = new URL(v.link.trim());
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
      return null;
    } catch {
      return "Enter a valid link starting with https://";
    }
  }
  return "Add the video (upload it or paste a link).";
}

export function VideoPicker({
  value,
  onChange,
  allowLink = true,
  maxMb = 300,
  error,
}: {
  value: VideoValue;
  onChange: (v: VideoValue) => void;
  allowLink?: boolean;
  maxMb?: number;
  error?: string;
}) {
  const [mode, setMode] = useState<"upload" | "link">(value.link ? "link" : "upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value.file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value.file]);

  return (
    <div className="space-y-3">
      {allowLink && (
        <div className="w-56">
          <Segmented<"upload" | "link">
            label="Video method"
            value={mode}
            onChange={(m) => {
              setMode(m);
              onChange(EMPTY_VIDEO);
            }}
            options={[
              { id: "upload", label: "Upload" },
              { id: "link", label: "Paste link" },
            ]}
          />
        </div>
      )}

      {mode === "upload" ? (
        <div>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-iron-700 px-4 py-7 text-center transition hover:border-volt-400/70 hover:bg-iron-900">
            <Upload className="h-7 w-7 text-volt-400" />
            <span className="font-semibold">
              {value.file ? value.file.name : "Tap to choose the uncut video"}
            </span>
            <span className="text-xs text-iron-500">
              MP4 / MOV · up to {maxMb} MB
              {value.file ? ` · ${(value.file.size / 1024 / 1024).toFixed(1)} MB selected` : ""}
            </span>
            <input
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(e) => onChange({ file: e.target.files?.[0] ?? null, link: "" })}
            />
          </label>
          {previewUrl && (
            <video src={previewUrl} controls playsInline className="mt-3 max-h-72 w-full rounded-lg bg-black" />
          )}
        </div>
      ) : (
        <div className="relative">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-iron-500" />
          <input
            type="url"
            className="field pl-9"
            value={value.link}
            onChange={(e) => onChange({ file: null, link: e.target.value })}
            placeholder="https://youtube.com/watch?v=… (unlisted is fine)"
            aria-label="Video link"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs font-medium text-blood-400">
          {error}
        </p>
      )}
    </div>
  );
}
