"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { saveEntry, useAccount, useIsClient, type Profile } from "@/lib/account";
import {
  EXPERIENCE,
  WEIGHT_CLASSES,
  ageGroupFor,
  ageGroupLabel,
  classLabel,
  weightClassFor,
} from "@/lib/categories";
import { MEET, newEntry, type MeetEntry } from "@/lib/meet";
import type { Experience } from "@/lib/types";
import { Field } from "@/components/ui/Field";

export function RegisterForm() {
  const ready = useIsClient();
  const { profile, entry } = useAccount();
  if (!ready || !profile) return null; // RequireProfile handles the gate
  return <RegisterInner profile={profile} entry={entry} />;
}

function RegisterInner({ profile, entry }: { profile: Profile; entry: MeetEntry | null }) {
  const router = useRouter();
  const suggested = weightClassFor(profile.bodyweightKg, profile.sex) ?? WEIGHT_CLASSES[profile.sex][0]!;

  const [experience, setExperience] = useState<Experience>(entry?.experience ?? "novice");
  const [wc, setWc] = useState(entry?.weightClass ?? suggested);
  const [error, setError] = useState("");

  const ageGroup = ageGroupFor(profile.age);
  const locked = Boolean(entry?.weighIn);
  const classes = WEIGHT_CLASSES[profile.sex];

  function onSubmit() {
    if (!ageGroup) {
      setError("You must be 14 or older to compete.");
      return;
    }
    const next: MeetEntry = entry
      ? { ...entry, experience, weightClass: wc }
      : newEntry(experience, wc);
    if (!saveEntry(next)) {
      setError("Couldn't save. Browser storage is full or blocked.");
      return;
    }
    router.push(entry ? "/compete" : "/compete/weigh-in");
  }

  return (
    <div className="panel space-y-7 p-5 sm:p-8">
      {locked && (
        <div className="flex items-start gap-2.5 rounded-lg bg-iron-950 p-3.5 text-sm text-iron-300 ring-1 ring-iron-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-volt-400" />
          Your weigh-in has been submitted, so your category is locked. Contact a moderator to
          change it.
        </div>
      )}

      {/* Experience */}
      <fieldset disabled={locked} className="space-y-3">
        <legend className="mb-1 text-[11px] font-bold uppercase tracking-stencil text-iron-500">
          1 · Experience level
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {EXPERIENCE.map((x) => {
            const active = experience === x.id;
            return (
              <label
                key={x.id}
                className={`cursor-pointer rounded-xl p-4 ring-1 transition ${
                  active
                    ? "bg-volt-400/10 ring-2 ring-volt-400"
                    : "bg-iron-950 ring-iron-800 hover:ring-iron-600"
                } ${locked ? "opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name="experience"
                  className="sr-only"
                  checked={active}
                  onChange={() => setExperience(x.id)}
                />
                <span className="flex items-center justify-between">
                  <span className="font-display text-xl font-extrabold uppercase">{x.label}</span>
                  {active && <CheckCircle2 className="h-5 w-5 text-volt-400" />}
                </span>
                <span className="mt-1 block text-xs text-iron-400">{x.blurb}</span>
              </label>
            );
          })}
        </div>
        <p className="text-xs text-iron-500">
          Be honest. Moderators can move you up a level if your results are far above your class.
        </p>
      </fieldset>

      {/* Weight class */}
      <fieldset disabled={locked} className="space-y-3">
        <legend className="mb-1 text-[11px] font-bold uppercase tracking-stencil text-iron-500">
          2 · Weight class ({profile.sex === "M" ? "Men" : "Women"} · IPF)
        </legend>
        <div className="flex flex-wrap gap-2">
          {classes.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setWc(c)}
              className={`rounded-lg px-4 py-2.5 font-display text-lg font-extrabold tracking-wide ring-1 transition ${
                wc === c
                  ? "bg-volt-400 text-iron-950 ring-volt-400"
                  : "text-iron-300 ring-iron-700 hover:text-iron-50 hover:ring-iron-500"
              } disabled:opacity-60`}
            >
              {classLabel(c)}
              {c === suggested && (
                <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide opacity-70">
                  your weight
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-iron-500">
          Your profile weight ({profile.bodyweightKg} kg) fits {classLabel(suggested)}. The class you
          pick must match your verified weigh-in weight.
        </p>
      </fieldset>

      {/* Age group */}
      <Field label="3 · Age group (automatic)">
        <p className="rounded-lg bg-iron-950 px-3 py-2.5 text-sm ring-1 ring-iron-800">
          {ageGroup ? (
            <>
              <b className="text-volt-300">{ageGroupLabel(ageGroup)}</b>
              <span className="text-iron-400"> · based on your age ({profile.age})</span>
            </>
          ) : (
            <span className="text-blood-400">You must be 14 or older to compete.</span>
          )}
        </p>
      </Field>

      <div className="rounded-lg bg-iron-950 p-3.5 text-sm text-iron-300 ring-1 ring-iron-800">
        <b className="text-iron-100">Entering:</b> {MEET.name} ·{" "}
        {profile.sex === "M" ? "Men" : "Women"} {classLabel(wc)} ·{" "}
        {EXPERIENCE.find((x) => x.id === experience)?.short}
        {ageGroup ? ` · ${ageGroupLabel(ageGroup)}` : ""} · {profile.district}
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-blood-400">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onSubmit} disabled={locked} className="btn-volt">
          {entry ? "Save category" : "Register & go to weigh-in"}
        </button>
        <Link href="/compete" className="btn-ghost">
          Back
        </Link>
      </div>
    </div>
  );
}
