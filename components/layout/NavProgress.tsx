"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Thin progress bar at the top that appears the moment you tap an internal link, so a slow
 * page load never looks like "nothing happened" (which makes people tap again and again).
 */
export function NavProgress() {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBusy(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setBusy(true);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Never hang forever if a navigation is cancelled.
  useEffect(() => {
    if (!busy) return;
    const t = setTimeout(() => setBusy(false), 12000);
    return () => clearTimeout(t);
  }, [busy]);

  if (!busy) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-volt-400/20">
      <div className="h-full w-1/3 animate-[navbar_1s_ease-in-out_infinite] rounded-full bg-volt-400 shadow-glow-volt" />
    </div>
  );
}
