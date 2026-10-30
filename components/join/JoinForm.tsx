"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { saveProfile, useAccount, useIsClient, type Profile } from "@/lib/account";
import type { MeetEntry } from "@/lib/meet";
import { DISTRICTS } from "@/lib/districts";
import { MIN_AGE } from "@/lib/categories";
import type { Sex } from "@/lib/types";
import { Field } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { DecimalInput } from "@/components/ui/DecimalInput";
import { PhotoPicker } from "@/components/account/PhotoPicker";
import { CompetitionSummary } from "@/components/join/CompetitionSummary";
import { socialAvatar, useAuth } from "@/lib/auth";
import { blobToDataUrl } from "@/lib/image";
import { setMode } from "@/lib/mode";
import { ProBadge } from "@/components/account/ProBadge";

export function JoinForm() {
  const ready = useIsClient();
  const { profile, entry } = useAccount();
  if (!ready) return <div className="panel h-96 animate-pulse-glow" aria-hidden />;
  return <JoinFormInner initial={profile} entry={entry} />;
}

function JoinFormInner({ initial, entry }: { initial: Profile | null; entry: MeetEntry | null }) {
  const router = useRouter();
  const { user, cloud, isPro, logout, configured } = useAuth();

  const [name, setName] = useState(initial?.name ?? cloud?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? user?.email ?? "");
  const [sex, setSex] = useState<Sex>(initial?.sex ?? cloud?.sex ?? "M");
  const [age, setAge] = useState(initial?.age ? String(initial.age) : cloud?.age ? String(cloud.age) : "");
  const [bw, setBw] = useState(initial ? String(initial.bodyweightKg) : cloud?.bodyweight_kg ? String(cloud.bodyweight_kg) : "");
  const [gym, setGym] = useState(initial?.homeGym ?? cloud?.home_gym ?? "");
  const [district, setDistrict] = useState(initial?.district ?? cloud?.district ?? "");
  const [area, setArea] = useState(initial?.area ?? cloud?.area ?? "");
  const [avatar, setAvatar] = useState<string | undefined>(initial?.avatarDataUrl);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  // Google / Facebook photo as the starting profile picture (saved as a small local copy).
  const social = socialAvatar(user);
  useEffect(() => {
    if (avatar || !social) return;
    let cancelled = false;
    fetch(social, { referrerPolicy: "no-referrer" })
      .then((r) => r.blob())
      .then(blobToDataUrl)
      .then((u) => !cancelled && setAvatar((cur) => cur ?? u))
      .catch(() => {
        /* the provider blocked the download: the header still shows the photo; upload one here */
      });
    return () => {
      cancelled = true;
    };
  }, [social, avatar]);

  // Category is locked once the weigh-in has been sent.
  const locked = Boolean(entry?.weighIn);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const bwNum = parseFloat(bw);
    const ageNum = parseInt(age, 10);

    if (name.trim().length < 2) errs.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "Enter a valid email.";
    if (!(ageNum >= MIN_AGE && ageNum <= 90)) errs.age = `Competitors must be ${MIN_AGE} or older.`;
    if (!(bwNum >= 30 && bwNum <= 250)) errs.bw = "Bodyweight must be 30–250 kg.";
    if (gym.trim().length < 2) errs.gym = "Enter your home gym.";
    if (!district) errs.district = "Choose your district.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const ok = saveProfile({
      name: name.trim(),
      email: (user?.email ?? email).trim().toLowerCase(),
      sex,
      age: ageNum,
      bodyweightKg: Math.round(bwNum * 10) / 10,
      homeGym: gym.trim(),
      district,
      area: area.trim() || undefined,
      avatarDataUrl: avatar,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
    if (!ok) {
      setFormError("Couldn't save. Your browser storage is full or blocked. Try a smaller photo.");
      return;
    }
    router.push(isPro ? "/compete" : "/welcome");
  }

  async function onSignOut() {
    if (window.confirm("Log out? Your data stays saved in your account; this device's copy is cleared.")) {
      await logout();
      setMode(null);
      router.push("/");
    }
  }

  return (
    <div className="space-y-6">
      {user && (
        <p className="text-sm text-iron-400">
          Change your password, email or log out in{" "}
          <Link href="/account" className="font-semibold text-volt-400 underline">Account settings</Link>.
        </p>
      )}
      {isPro && (
        <div className="flex items-center gap-2">
          <ProBadge />
          <span className="text-xs text-iron-400">Your profile and the leaderboard show the Pro badge.</span>
        </div>
      )}
      {initial && <CompetitionSummary profile={initial} entry={entry} />}

      <form onSubmit={onSubmit} noValidate className="panel space-y-6 p-5 sm:p-8">
        <PhotoPicker value={avatar} name={name} onChange={setAvatar} />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" htmlFor="name" error={errors.name}>
            <input
              id="name"
              className="field"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rakib Hasan"
            />
          </Field>

          <Field label="Email" htmlFor="email" error={errors.email}>
            <input
              id="email"
              type="email"
              className="field"
              autoComplete="email"
              value={user?.email ?? email}
              readOnly={Boolean(user)}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </Field>

          <Field label="Age" htmlFor="age" error={errors.age}>
            <DecimalInput id="age" integer suffix="yrs" value={age} onChange={setAge} placeholder="e.g. 24" />
          </Field>

          <div className={locked ? "pointer-events-none opacity-60" : ""}>
            <Segmented<Sex>
              label="Gender"
              value={sex}
              onChange={setSex}
              options={[
                { id: "M", label: "Male" },
                { id: "F", label: "Female" },
              ]}
            />
          </div>

          <Field label="Bodyweight (kg)" htmlFor="bw" error={errors.bw}>
            <DecimalInput id="bw" suffix="kg" value={bw} onChange={setBw} placeholder="e.g. 83" />
          </Field>

          <Field label="District" htmlFor="district" error={errors.district}>
            <select
              id="district"
              className="field"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            >
              <option value="" disabled>
                Choose your district
              </option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Home gym" htmlFor="gym" error={errors.gym}>
            <input
              id="gym"
              className="field"
              value={gym}
              onChange={(e) => setGym(e.target.value)}
              placeholder="e.g. Iron Temple"
            />
          </Field>

          <Field label="Area / thana (optional)" htmlFor="area">
            <input
              id="area"
              className="field"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Mirpur"
            />
          </Field>
        </div>

        {locked && (
          <p className="text-xs text-iron-500">
            Gender is locked because your weigh-in has been submitted. Your weigh-in weight is
            what counts for your weight class.
          </p>
        )}

        <div className="flex items-start gap-2.5 rounded-lg bg-iron-950 p-3.5 text-xs text-iron-400 ring-1 ring-iron-800">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-volt-400" />
          <p>
            {configured && user ? (
              <>Your profile is saved to your account. Moderators may ask for ID to confirm your age.</>
            ) : (
              <>
                Demo mode: your profile is saved on <strong className="text-iron-200">this device only</strong>.
                Moderators may ask for ID to confirm your age.
              </>
            )}
          </p>
        </div>

        {formError && (
          <p role="alert" className="text-sm font-medium text-blood-400">
            {formError}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-volt">
            {initial ? "Save profile" : "Join the league"}
          </button>
          {initial && (
            <button type="button" onClick={onSignOut} className="btn-ghost !text-blood-400">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
