"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface AccordionItem {
  id: string;
  number: string;
  title: string;
  summary: string;
  content: ReactNode;
}

/** Collapsible sections with expand/collapse all. Deep-linkable via #id. */
export function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<Set<string>>(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    return new Set([hash && items.some((i) => i.id === hash) ? hash : items[0]!.id]);
  });
  const toggle = (id: string) =>
    setOpen((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const all = open.size === items.length;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(all ? new Set() : new Set(items.map((i) => i.id)))}
          className="text-xs font-bold uppercase tracking-stencil text-volt-400 hover:text-volt-300"
        >
          {all ? "Collapse all" : "Expand all"}
        </button>
      </div>
      {items.map((it) => {
        const isOpen = open.has(it.id);
        return (
          <section key={it.id} id={it.id} className="panel scroll-mt-24 overflow-hidden">
            <h2>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`${it.id}-panel`}
                onClick={() => toggle(it.id)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-iron-900"
              >
                <span className="font-display text-4xl font-black leading-none text-volt-400">{it.number}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-2xl font-black uppercase leading-tight tracking-wide sm:text-3xl">
                    {it.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-iron-400">{it.summary}</span>
                </span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-iron-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
            </h2>
            {isOpen && (
              <div id={`${it.id}-panel`} role="region" aria-labelledby={it.id} className="space-y-4 border-t border-iron-800 px-5 py-5">
                {it.content}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
