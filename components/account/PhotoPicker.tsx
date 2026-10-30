"use client";

import { useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { fileToDataUrl } from "@/lib/image";
import { initials } from "@/lib/format";

export function PhotoPicker({
  value,
  name,
  onChange,
}: {
  value?: string;
  name: string;
  onChange: (dataUrl: string | undefined) => void;
}) {
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      onChange(await fileToDataUrl(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't use that photo.");
    }
  }

  return (
    <div className="flex items-center gap-5">
      <label className="group relative block h-28 w-28 shrink-0 cursor-pointer overflow-hidden rounded-full bg-iron-800 ring-2 ring-iron-700 transition hover:ring-volt-400">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Your profile photo" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center font-display text-4xl font-black text-iron-500">
            {initials(name) || <Camera className="h-8 w-8" />}
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 grid place-items-center bg-iron-950/75 py-1.5 text-iron-100 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <Camera className="h-4 w-4" />
        </span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Upload profile photo"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>

      <div className="min-w-0">
        <p className="font-semibold text-iron-100">Profile photo</p>
        <p className="mt-0.5 text-sm text-iron-400">
          This goes on your Flex Card, so pick a strong gym pic. Portrait photos
          look best.
        </p>
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-iron-400 transition hover:text-blood-400"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove photo
          </button>
        )}
        {error && (
          <p role="alert" className="mt-2 text-xs font-medium text-blood-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
