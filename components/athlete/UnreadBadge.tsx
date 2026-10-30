"use client";

import { useUnreadCount } from "@/lib/social";

/** Small red number on the Messages icon. Renders nothing when there's nothing unread. */
export function UnreadBadge() {
  const n = useUnreadCount();
  if (n <= 0) return null;
  return (
    <span
      aria-label={`${n} unread messages`}
      className="absolute -right-2 -top-1.5 grid min-w-[1.1rem] place-items-center rounded-full bg-blood-500 px-1 text-[10px] font-extrabold leading-4 text-white"
    >
      {n > 9 ? "9+" : n}
    </span>
  );
}
