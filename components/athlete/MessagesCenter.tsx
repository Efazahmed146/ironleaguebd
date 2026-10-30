"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, MessageCircle, Search, UserCheck, UserPlus } from "lucide-react";
import { useIsClient } from "@/lib/account";
import { useAuth } from "@/lib/auth";
import { fetchPeopleByIds, isUuid, searchPeople, useInbox, useNetwork, useSocial, type Person } from "@/lib/social";
import { ChatPanel } from "./ChatPanel";
import { PersonAvatar } from "./PersonAvatar";

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const matches = (p: Person, q: string) =>
  [p.name, p.homeGym, p.district].some((v) => v.toLowerCase().includes(q.toLowerCase()));

function PersonRow({ p, onPick, sub }: { p: Person; onPick: () => void; sub?: string }) {
  return (
    <li>
      <button type="button" onClick={onPick} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-iron-850">
        <PersonAvatar name={p.name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-iron-50">{p.name}</span>
          <span className="flex items-center gap-1 truncate text-xs text-iron-400">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{sub ?? ([p.homeGym, p.district].filter(Boolean).join(" · ") || "Bangladesh")}</span>
          </span>
        </span>
        <MessageCircle className="h-4 w-4 shrink-0 text-volt-400" />
      </button>
    </li>
  );
}

function ChatWith({ person, onBack }: { person: Person; onBack: () => void }) {
  const social = useSocial(person.id, person.name);
  return (
    <div className="space-y-3">
      <div className="panel flex items-center gap-3 p-3">
        <button type="button" onClick={onBack} aria-label="Back to messages" className="btn-ghost !p-2.5 lg:hidden">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <PersonAvatar name={person.name} />
        <Link href={`/athlete/${person.id}`} className="min-w-0 flex-1">
          <span className="block truncate font-display text-xl font-extrabold uppercase leading-tight hover:text-volt-300">{person.name}</span>
          <span className="block truncate text-xs text-iron-400">
            {[person.homeGym, person.district].filter(Boolean).join(" · ") || "View profile"}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => void social.toggleFollow()}
          aria-pressed={social.following}
          className={`${social.following ? "btn-ghost" : "btn-volt"} !px-3 !py-2 text-xs`}
        >
          {social.following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          <span className="hidden min-[400px]:inline">{social.following ? "Following" : "Follow"}</span>
        </button>
      </div>
      <ChatPanel messages={social.messages} send={social.send} demo={!person.cloud} loading={social.loading} id={person.id} tall />
    </div>
  );
}

/** One place to find anyone and message them: search by name, gym or district. */
export function MessagesCenter({ demo }: { demo: Person[] }) {
  const ready = useIsClient();
  const { user } = useAuth();
  const me = user?.id ?? null;
  const { threads, loading } = useInbox();
  const { following } = useNetwork();

  const [q, setQ] = useState("");
  const [found, setFound] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Person | null>(null);

  const query = q.trim();

  // Search real members (debounced). Demo lifters are matched instantly below.
  useEffect(() => {
    if (query.length < 2) {
      setFound([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let alive = true;
    const t = setTimeout(async () => {
      const r = await searchPeople(query, me);
      if (alive) {
        setFound(r);
        setSearching(false);
      }
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, me]);

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const demos = demo.filter((p) => matches(p, query)).slice(0, 8);
    const seen = new Set(found.map((p) => p.id));
    return [...found, ...demos.filter((p) => !seen.has(p.id))];
  }, [query, found, demo]);

  const pick = (p: Person) => {
    setSelected(p);
    try {
      window.history.replaceState(null, "", `/messages?with=${encodeURIComponent(p.id)}`);
    } catch {
      /* ignore */
    }
  };
  const back = () => {
    setSelected(null);
    try {
      window.history.replaceState(null, "", "/messages");
    } catch {
      /* ignore */
    }
  };

  // Open the chat from /messages?with=<id> (profile and network buttons link here).
  useEffect(() => {
    if (!ready) return;
    const id = new URLSearchParams(window.location.search).get("with");
    if (!id || selected?.id === id) return;
    const known = demo.find((p) => p.id === id) ?? following.find((p) => p.id === id);
    if (known) return setSelected(known);
    const th = threads.find((t) => t.id === id);
    if (th) return setSelected({ id, name: th.name, homeGym: "", district: "", cloud: th.cloud });
    if (isUuid(id)) {
      void fetchPeopleByIds([id]).then((r) => r[0] && setSelected(r[0]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, demo, following.length, threads.length]);

  if (!ready) return <div className="panel h-64 animate-pulse-glow" aria-busy="true" />;
  if (!user) return <div className="panel p-8 text-center"><Link href="/login" className="btn-volt">Log in to message</Link></div>;

  const list = (
    <div className={`space-y-4 ${selected ? "hidden lg:block" : ""}`}>
      <label className="relative block">
        <span className="sr-only">Search lifters</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-iron-500" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, gym or district"
          className="field !pl-10"
          autoComplete="off"
        />
      </label>

      {query.length >= 2 ? (
        <ul className="panel divide-y divide-iron-800 overflow-hidden">
          {results.map((p) => (
            <PersonRow key={p.id} p={p} onPick={() => pick(p)} />
          ))}
          {results.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-iron-400">{searching ? "Searching…" : `No lifter found for "${query}".`}</li>
          )}
        </ul>
      ) : (
        <>
          {following.length > 0 && (
            <section aria-label="People you follow">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-stencil text-iron-500">Following</p>
              <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                {following.map((p) => (
                  <li key={p.id} className="shrink-0">
                    <button type="button" onClick={() => pick(p)} className="flex w-16 flex-col items-center gap-1 text-center">
                      <PersonAvatar name={p.name} />
                      <span className="w-full truncate text-[11px] font-semibold text-iron-300">{p.name.split(" ")[0]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-label="Conversations">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-stencil text-iron-500">Messages</p>
            {loading ? (
              <div className="panel h-24 animate-pulse-glow" aria-busy="true" />
            ) : threads.length === 0 ? (
              <div className="panel p-6 text-center">
                <MessageCircle className="mx-auto h-8 w-8 text-volt-400" />
                <p className="mt-2 font-display text-2xl font-black uppercase">No messages yet</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-iron-400">Search for a lifter above and say hello.</p>
              </div>
            ) : (
              <ul className="panel divide-y divide-iron-800 overflow-hidden">
                {threads.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() =>
                        pick(
                          demo.find((d) => d.id === t.id) ??
                            following.find((f) => f.id === t.id) ?? { id: t.id, name: t.name, homeGym: "", district: "", cloud: t.cloud },
                        )
                      }
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-iron-850 ${selected?.id === t.id ? "bg-iron-850" : ""}`}
                    >
                      <PersonAvatar name={t.name} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-semibold text-iron-50">{t.name}</span>
                          <span className="shrink-0 text-[11px] text-iron-500">{when(t.last.at)}</span>
                        </span>
                        <span className="block truncate text-sm text-iron-400">
                          {t.last.from === "me" ? "You: " : ""}
                          {t.last.body}
                        </span>
                      </span>
                      {t.unread > 0 && (
                        <span className="chip shrink-0 bg-volt-400 text-iron-950 ring-volt-400" aria-label={`${t.unread} unread`}>
                          {t.unread}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
      {list}
      <div className={selected ? "" : "hidden lg:block"}>
        {selected ? (
          <ChatWith key={selected.id} person={selected} onBack={back} />
        ) : (
          <div className="panel grid h-64 place-items-center p-6 text-center text-sm text-iron-500">
            Pick a conversation or search for a lifter to start chatting.
          </div>
        )}
      </div>
    </div>
  );
}
