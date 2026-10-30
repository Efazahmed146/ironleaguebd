import { Camera, CheckCircle2 } from "lucide-react";
import type { Lift } from "@/lib/types";
import { LIFT_STANDARDS, VIDEO_RULES } from "@/lib/meet";

/** Collapsible lift-standards notice (works without JS: native <details>). */
export function StandardsNotice({ lift, open = false }: { lift: Lift; open?: boolean }) {
  const s = LIFT_STANDARDS[lift];
  return (
    <details open={open} className="group rounded-lg bg-iron-950 ring-1 ring-iron-800">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-iron-200 marker:hidden">
        <span>📋 Judging standard: {s.title}</span>
        <span className="text-xs text-volt-400 group-open:hidden">Show</span>
        <span className="hidden text-xs text-volt-400 group-open:inline">Hide</span>
      </summary>
      <div className="space-y-3 border-t border-iron-800 px-4 py-3">
        <ul className="space-y-1.5 text-sm text-iron-300">
          {s.rules.map((r) => (
            <li key={r} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-volt-400" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
        <p className="flex gap-2 text-sm text-iron-300">
          <Camera className="mt-0.5 h-4 w-4 shrink-0 text-blood-400" />
          <span>
            <b className="text-iron-100">Camera:</b> {s.angle}
          </span>
        </p>
        <details className="text-xs text-iron-400">
          <summary className="cursor-pointer text-iron-300">Video requirements (all lifts)</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {VIDEO_RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </details>
      </div>
    </details>
  );
}
