"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { useIsClient } from "@/lib/account";
import { useAuth } from "@/lib/auth";
import { Field } from "@/components/ui/Field";
import { normalizeBdPhone } from "@/lib/phone";

type Tab = "login" | "register" | "forgot";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  const { configured, signInEmail, signUpEmail, signInOAuth, requestPasswordReset } = useAuth();
  // Until React has loaded, a click would submit the form natively and just reload the page.
  const hydrated = useIsClient();

  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const err = params.get("error");
  const confirmed = params.get("confirmed") === "1";
  const [formError, setFormError] = useState(
    err === "expired"
      ? "That link expired or was already used. If you already confirmed your email, just log in below."
      : err
        ? "That sign-in link didn't work. If you already confirmed your email, just log in below."
        : "",
  );
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const welcome = safeNext ? `/welcome?next=${encodeURIComponent(safeNext)}` : "/welcome";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (tab === "register" && name.trim().length < 2) errs.name = "Enter your name.";
    const e164 = normalizeBdPhone(phone);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "Enter a valid email.";
    // The mobile number is just a profile detail saved to your account (no verification code).
    if (tab === "register" && !e164) errs.phone = "Enter a valid mobile number, e.g. 01712345678.";
    if (tab !== "forgot" && password.length < 8) errs.password = "Use at least 8 characters.";
    setErrors(errs);
    setFormError("");
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      if (tab === "forgot") {
        const err = await requestPasswordReset(email);
        if (err) return setFormError(err);
        return setResetSent(true);
      }
      if (tab === "login") {
        const err = await signInEmail(email, password);
        if (err) return setFormError(err);
        router.replace(welcome);
      } else {
        const r = await signUpEmail({
          name,
          email,
          phone: e164!,
          password,
        });
        if (r.error) return setFormError(r.error);
        if (r.needsConfirm) {
          return setConfirmSent(true);
        }
        router.replace(welcome);
      }
    } catch {
      setFormError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onOAuth(provider: "google" | "facebook") {
    setFormError("");
    const err = await signInOAuth(provider, safeNext ?? undefined);
    if (err) setFormError(err);
  }

  if (!configured) {
    return (
      <div className="panel p-6 text-sm text-iron-300">
        Supabase isn&apos;t configured. Copy <code>.env.example</code> to <code>.env.local</code>, fill in
        your project URL and publishable key, and restart <code>npm run dev</code>.
      </div>
    );
  }

  if (resetSent) {
    return (
      <div className="panel flex flex-col items-center gap-3 p-8 text-center">
        <MailCheck className="h-10 w-10 text-volt-400" />
        <p className="font-display text-3xl font-black uppercase">Check your email</p>
        <p className="max-w-sm text-sm text-iron-300">
          If <b>{email}</b> has an account, we sent a link to set a new password. It can take a minute; check spam too.
        </p>
        <button type="button" className="btn-ghost" onClick={() => { setResetSent(false); setTab("login"); }}>
          Back to log in
        </button>
      </div>
    );
  }

  if (confirmSent) {
    return (
      <div className="panel flex flex-col items-center gap-3 p-8 text-center">
        <MailCheck className="h-10 w-10 text-volt-400" />
        <p className="font-display text-3xl font-black uppercase">Check your email</p>
        <p className="max-w-sm text-sm text-iron-300">
          We sent a confirmation link to <b>{email}</b>. Open it to activate your account. If it opens in another
          browser or app, that&apos;s fine: come back here and log in.
        </p>
        <button type="button" className="btn-ghost" onClick={() => { setConfirmSent(false); setTab("login"); }}>
          Back to log in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="panel space-y-5 p-5 sm:p-8">
      {tab === "forgot" ? (
        <div>
          <p className="font-display text-2xl font-extrabold uppercase">Forgot password?</p>
          <p className="mt-1 text-sm text-iron-400">Enter your email and we&apos;ll send you a link to set a new one.</p>
        </div>
      ) : (
        <>
          <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg bg-iron-950 p-1 ring-1 ring-iron-800">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => { setTab(t); setErrors({}); setFormError(""); }}
                className={`rounded-md py-2 font-display text-sm font-bold uppercase tracking-wider transition ${
                  tab === t ? "bg-volt-400 text-iron-950" : "text-iron-300 hover:text-volt-300"
                }`}
              >
                {t === "login" ? "Log in" : "Create account"}
              </button>
            ))}
          </div>

          <div className="grid gap-3">
            <button type="button" onClick={() => onOAuth("google")} disabled={!hydrated} className="btn-ghost w-full justify-center">
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
              </svg>
              Continue with Google
            </button>
            <button type="button" onClick={() => onOAuth("facebook")} disabled={!hydrated} className="btn-ghost w-full justify-center">
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" />
              </svg>
              Continue with Facebook
            </button>
          </div>

          <p className="text-center text-[11px] uppercase tracking-stencil text-iron-500">or with email</p>

        </>
      )}

      {tab === "register" && (
        <Field label="Full name" htmlFor="name" error={errors.name}>
          <input id="name" className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rakib Hasan" />
        </Field>
      )}
      {(
        <Field label="Email" htmlFor="email" error={errors.email}>
          <input id="email" type="email" className="field" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </Field>
      )}
      {tab === "register" && (
        <Field label="Mobile number" htmlFor="phone" error={errors.phone}>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            className="field"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01712345678"
          />
        </Field>
      )}
      {tab !== "forgot" && (
      <Field label="Password" htmlFor="password" error={errors.password}>
        <input
          id="password"
          type="password"
          className="field"
          autoComplete={tab === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
      </Field>
      )}
      {tab === "login" && (
        <button type="button" onClick={() => { setTab("forgot"); setErrors({}); setFormError(""); }} className="text-sm font-semibold text-volt-400 hover:text-volt-300">
          Forgot password?
        </button>
      )}

      {confirmed && !formError && (
        <p role="status" className="rounded-lg bg-volt-400/10 p-3 text-sm font-medium text-volt-300 ring-1 ring-volt-400/40">
          Your email is confirmed. Log in below to continue.
        </p>
      )}
      {formError && <p role="alert" className="text-sm font-medium text-blood-400">{formError}</p>}

      <button type="submit" disabled={busy || !hydrated} className="btn-volt w-full justify-center">
        {!hydrated ? "Loading…" : busy ? "Please wait…" : tab === "login" ? "Log in" : tab === "register" ? "Create account" : "Send reset link"}
      </button>
      {tab === "forgot" && (
        <button type="button" onClick={() => setTab("login")} className="btn-ghost w-full justify-center">Back to log in</button>
      )}
    </form>
  );
}
