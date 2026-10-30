import { useSyncExternalStore } from "react";

/**
 * The choice made on the Welcome screen. It's a convenience for the header
 * ("Guest mode"); it does NOT grant access: only a paid subscription does, and the
 * database enforces that with Row Level Security.
 */
export type Mode = "guest" | "compete";
const KEY = "ironleague:mode";
const listeners = new Set<() => void>();

function read(): Mode | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "guest" || v === "compete" ? v : null;
  } catch {
    return null;
  }
}

export function setMode(m: Mode | null) {
  try {
    if (m) localStorage.setItem(KEY, m);
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useMode(): Mode | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => null,
  );
}
