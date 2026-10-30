"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useIsClient } from "@/lib/account";
import { useInbox } from "@/lib/social";
import { initials } from "@/lib/format";

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function Inbox() {
  const client = useIsClient();
  const { threads, loading } = useInbox();

  if (!client || loading) return <div className="panel h-40 animate-pulse-glow" aria-busy="true" />;

  if (threads.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <MessageCircle className="mx-auto h-9 w-9 text-volt-400" />
        <p className="mt-3 font-display text-3xl font-black uppercase">No messages yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-iron-400">Open a lifter from the leaderboard and tap Message to start a chat.</p>
        <Link href="/#leaderboard" className="btn-volt mt-5 inline-flex">Browse leaderboard</Link>
      </div>
    );
  }

  return (
    <ul className="panel divide-y divide-iron-800 overflow-hidden">
      {threads.map((t) => (
        <li key={t.id}>
          <Link href={`/athlete/${t.id}#message`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-iron-850">
            <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-iron-800 font-display text-lg font-extrabold text-iron-200 ring-2 ring-iron-700">
              {initials(t.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate font-semibold text-iron-50">{t.name}</span>
                <span className="shrink-0 text-[11px] text-iron-500">{when(t.last.at)}</span>
              </span>
              <span className="block truncate text-sm text-iron-400">
                {t.last.from === "me" ? "You: " : ""}{t.last.body}
              </span>
            </span>
            {t.unread > 0 && (
              <span className="chip shrink-0 bg-volt-400 text-iron-950 ring-volt-400" aria-label={`${t.unread} unread`}>{t.unread}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
