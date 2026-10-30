"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { markRead, type Msg } from "@/lib/social";

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function ChatPanel({ messages, send, demo, loading, id, tall }: { messages: Msg[]; send: (b: string) => Promise<string | null>; demo: boolean; loading: boolean; id: string; tall?: boolean }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  useEffect(() => {
    if (user && messages.some((m) => m.from === "them")) void markRead(user.id, id);
  }, [user, id, messages]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await send(text);
    setBusy(false);
    if (r) return setErr(r);
    setErr("");
    setText("");
  }

  return (
    <section id="message" className="panel scroll-mt-24 p-4 sm:p-6">
      <h2 className="mb-1 flex items-center gap-2 font-display text-2xl font-extrabold uppercase">
        <MessageCircle className="h-5 w-5 text-volt-400" /> Message
      </h2>
      {demo && (
        <p className="mb-3 text-xs text-iron-500">
          This is a demo lifter, so nobody will reply. Messages to demo lifters are saved on this device only. Real members get your message in their inbox.
        </p>
      )}
      <div className={`mb-3 space-y-2 overflow-y-auto ${tall ? "h-[50vh] min-h-64" : "max-h-72"} rounded-lg bg-iron-950 p-3 ring-1 ring-iron-800`}>
        {loading ? (
          <p className="text-sm text-iron-500">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-iron-500">No messages yet. Say hello 👋</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.from === "me" ? "bg-volt-400 text-iron-950" : "bg-iron-800 text-iron-100"}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-0.5 text-[10px] ${m.from === "me" ? "text-iron-800" : "text-iron-500"}`}>{timeAgo(m.at)}</p>
              </div>
            </div>
          ))
        )}
        <div ref={end} />
      </div>
      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <textarea
          className="field min-h-[2.75rem] flex-1 resize-none"
          rows={2}
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message…"
          aria-label="Message"
        />
        <button type="submit" disabled={busy || !text.trim()} className="btn-volt shrink-0" aria-label="Send message">
          <Send className="h-4 w-4" />
        </button>
      </form>
      {err && <p role="alert" className="mt-2 text-sm font-medium text-blood-400">{err}</p>}
    </section>
  );
}

