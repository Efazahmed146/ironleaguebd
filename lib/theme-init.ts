/** Server-safe (no React hooks): used by app/layout.tsx. */
export const THEME_KEY = "ironleague:theme";

/** Runs in <head> before first paint so there's no dark/light flash. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}`;
