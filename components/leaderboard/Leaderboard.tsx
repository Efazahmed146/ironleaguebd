"use client";

import { useMemo, useState } from "react";
import { Search, SearchX, ShieldCheck } from "lucide-react";
import type { Lifter, Metric } from "@/lib/types";
import { accountToLifter, useAccount } from "@/lib/account";
import { useAuth } from "@/lib/auth";
import { useCloudLifters } from "@/lib/cloud-lifters";
import {
  DEFAULT_FILTERS,
  buildLeaderboard,
  getDistricts,
  type LeaderboardFilters,
  type RankMode,
} from "@/lib/leaderboard";
import { AGE_GROUPS, EXPERIENCE, WEIGHT_CLASSES, classLabel } from "@/lib/categories";
import { Segmented } from "@/components/ui/Segmented";
import { LeaderboardRow, ROW_GRID } from "./LeaderboardRow";

const METRICS: { id: Metric; label: string }[] = [
  { id: "total", label: "Total" },
  { id: "squat", label: "Squat" },
  { id: "bench", label: "Bench" },
  { id: "deadlift", label: "Deadlift" },
];

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-bold uppercase tracking-stencil text-iron-500"
      >
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="field">
        {children}
      </select>
    </div>
  );
}

export function Leaderboard({ lifters }: { lifters: Lifter[] }) {
  const [filters, setFilters] = useState<LeaderboardFilters>(DEFAULT_FILTERS);
  const patch = (p: Partial<LeaderboardFilters>) => setFilters((f) => ({ ...f, ...p }));

  // Add the signed-in lifter (this device) to the demo field.
  const account = useAccount();
  const { isPro, user } = useAuth();
  const cloudLifters = useCloudLifters();
  const everyone = useMemo(() => {
    const me = accountToLifter(account, isPro);
    // Real lifters from every device. Your own row comes from this device (always freshest).
    const others = cloudLifters.filter((l) => l.id !== user?.id);
    const all = [...lifters, ...others];
    return me ? [...all, me] : all;
  }, [lifters, cloudLifters, account, isPro, user?.id]);

  const districts = useMemo(() => getDistricts(everyone), [everyone]);
  const rows = useMemo(() => buildLeaderboard(everyone, filters), [everyone, filters]);

  const p4p = filters.mode === "pound-for-pound";
  const where = filters.district === "all" ? "All Bangladesh" : filters.district;

  const classGroups = (["M", "F"] as const).filter((s) => filters.sex === "all" || filters.sex === s);

  return (
    <section id="leaderboard" aria-labelledby="board-title" className="scroll-mt-24">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Season 01 · {where}</p>
          <h2
            id="board-title"
            className="font-display text-4xl font-black uppercase leading-none tracking-wide sm:text-5xl"
          >
            The Board
          </h2>
        </div>
        <p className="text-sm text-iron-400">
          {rows.length} {rows.length === 1 ? "lifter" : "lifters"} ranked · Good Lifts only
        </p>
      </div>

      <div className="panel overflow-hidden">
        {/* Lift tabs */}
        <div role="tablist" aria-label="Lift type" className="grid grid-cols-4 border-b border-iron-800">
          {METRICS.map((m) => {
            const active = filters.metric === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => patch({ metric: m.id })}
                className={`relative py-4 font-display text-lg font-extrabold uppercase tracking-wider transition sm:text-xl ${
                  active ? "text-volt-400" : "text-iron-400 hover:text-iron-100"
                }`}
              >
                {m.label}
                {active && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 bg-volt-400 shadow-[0_0_12px_rgb(163_230_53)]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="grid gap-4 border-b border-iron-800 bg-iron-900/40 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
          <SelectField id="district" label="District" value={filters.district} onChange={(district) => patch({ district })}>
            <option value="all">All Bangladesh</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </SelectField>

          <SelectField
            id="wclass"
            label="Weight class"
            value={filters.weightClass}
            onChange={(weightClass) => patch({ weightClass })}
          >
            <option value="all">All classes</option>
            {classGroups.map((s) => (
              <optgroup key={s} label={s === "M" ? "Men" : "Women"}>
                {WEIGHT_CLASSES[s].map((c) => (
                  <option key={c} value={c}>
                    {classLabel(c)}
                  </option>
                ))}
              </optgroup>
            ))}
          </SelectField>

          <SelectField
            id="exp"
            label="Experience"
            value={filters.experience}
            onChange={(v) => patch({ experience: v as LeaderboardFilters["experience"] })}
          >
            <option value="all">All levels</option>
            {EXPERIENCE.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </SelectField>

          <SelectField
            id="age"
            label="Age group"
            value={filters.ageGroup}
            onChange={(v) => patch({ ageGroup: v as LeaderboardFilters["ageGroup"] })}
          >
            <option value="all">All ages</option>
            {AGE_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label} ({g.range})
              </option>
            ))}
          </SelectField>

          <Segmented<RankMode>
            label="Ranking"
            value={filters.mode}
            onChange={(mode) => patch({ mode })}
            options={[
              { id: "pound-for-pound", label: "DOTS" },
              { id: "absolute", label: "Absolute kg" },
            ]}
          />

          <Segmented<LeaderboardFilters["sex"]>
            label="Division"
            value={filters.sex}
            onChange={(sex) => patch({ sex, weightClass: "all" })}
            options={[
              { id: "all", label: "All" },
              { id: "M", label: "Men" },
              { id: "F", label: "Women" },
            ]}
          />

          <div className="sm:col-span-2">
            <label
              htmlFor="search"
              className="mb-1.5 block text-[11px] font-bold uppercase tracking-stencil text-iron-500"
            >
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-iron-500" />
              <input
                id="search"
                type="search"
                value={filters.query}
                onChange={(e) => patch({ query: e.target.value })}
                placeholder="Name or gym"
                className="field pl-9"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-4">
            <p className="text-xs text-iron-500">
              {p4p
                ? "Ranked by DOTS, fair across bodyweights."
                : "Ranked by raw kilograms lifted."}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={filters.verifiedOnly}
                onClick={() => patch({ verifiedOnly: !filters.verifiedOnly })}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ring-1 transition ${
                  filters.verifiedOnly
                    ? "bg-volt-400/15 text-volt-300 ring-volt-400/60"
                    : "text-iron-400 ring-iron-700 hover:text-iron-100"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Verified only
              </button>
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-iron-400 ring-1 ring-iron-700 transition hover:text-iron-100"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Column headings (≥ sm) */}
        <div
          aria-hidden
          className={`${ROW_GRID} hidden border-b border-iron-800 px-5 py-2.5 text-[11px] font-bold uppercase tracking-stencil text-iron-500 sm:grid`}
        >
          <span>Rank</span>
          <span>Lifter</span>
          <span className="text-right">Bodyweight</span>
          <span className="text-right">{p4p ? "Lift" : "DOTS"}</span>
          <span className="text-right">{p4p ? "DOTS" : "Lift"}</span>
        </div>

        {/* Rows */}
        {rows.length > 0 ? (
          <ol className="divide-y divide-iron-800/70">
            {rows.map((entry, i) => (
              <LeaderboardRow key={entry.lifter.id} entry={entry} mode={filters.mode} index={i} />
            ))}
          </ol>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <SearchX className="h-10 w-10 text-iron-600" />
            <p className="font-display text-2xl font-extrabold uppercase tracking-wide">No lifters found</p>
            <p className="max-w-sm text-sm text-iron-400">
              Nobody has a Good Lift in this category yet. Try another filter, or be the first to
              claim the top spot.
            </p>
            <button type="button" className="btn-ghost !py-2 text-sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
              Reset filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
