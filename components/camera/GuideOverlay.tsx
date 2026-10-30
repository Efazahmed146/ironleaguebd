import type { Lift } from "@/lib/types";
import { CAMERA_GUIDE } from "@/lib/camera-guide";

/** Alignment grid + per-lift reference lines drawn over the live camera. */
export function GuideOverlay({ lift }: { lift: Lift }) {
  const g = CAMERA_GUIDE[lift];
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {/* rule-of-thirds grid */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        {[33.33, 66.66].map((p) => (
          <g key={p} stroke="rgba(255,255,255,0.28)" strokeWidth="0.25">
            <line x1={p} y1="0" x2={p} y2="100" />
            <line x1="0" y1={p} x2="100" y2={p} />
          </g>
        ))}
        {/* safe frame */}
        <rect x="4" y="4" width="92" height="92" fill="none" stroke="rgba(163,230,53,0.55)" strokeWidth="0.35" strokeDasharray="2 1.5" />
      </svg>

      {/* lift-specific reference lines */}
      {g.lines.map((l) => (
        <div key={l.label} className="absolute inset-x-[4%]" style={{ top: `${l.y}%` }}>
          <div className="h-px w-full bg-volt-400/80" />
          <span className="absolute left-1 top-0.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-volt-300">
            {l.label}
          </span>
        </div>
      ))}

      {/* side-profile body guide */}
      <svg className="absolute bottom-[8%] left-1/2 h-[78%] -translate-x-1/2 opacity-30" viewBox="0 0 60 120" fill="none" stroke="#fff" strokeWidth="1.2">
        <circle cx="30" cy="12" r="7" />
        <path d="M30 19 V62 M30 30 L44 48 M30 62 L40 90 L38 116 M30 62 L24 90 L26 116" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <p className="absolute inset-x-0 top-2 text-center text-[11px] font-semibold uppercase tracking-wide text-white/80 drop-shadow">
        {g.angle}
      </p>
    </div>
  );
}
