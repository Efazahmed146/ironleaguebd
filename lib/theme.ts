"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY } from "./theme-init";

export type Theme = "dark" | "light";
const listeners = new Set<() => void>();

function read(): Theme {
  return typeof document !== "undefined" && document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* private mode: still works for this visit */
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "light" ? "#f4f4f6" : "#0b0b0e");
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => "dark",
  );
}
