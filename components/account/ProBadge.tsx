import { Crown } from "lucide-react";

/** "Verified / Pro" badge shown for active subscribers. */
export function ProBadge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span title="Verified Pro member" className="inline-flex shrink-0 items-center" aria-label="Verified Pro member">
        <Crown className="h-4 w-4 text-amber-300" />
      </span>
    );
  }
  return (
    <span className="chip bg-amber-300/15 text-amber-200 ring-amber-300/50">
      <Crown className="h-3 w-3" /> Verified Pro
    </span>
  );
}
