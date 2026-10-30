"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Field } from "@/components/ui/Field";

/** Landing page of the "reset your password" email link. */
export function ResetPasswordForm() {
  const router = useRouter();
  const { ready, user, updatePassword } = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!ready) return <div className="panel h-64 animate-pulse-glow" aria-hidden />;

  if (!user) {
    return (
      <div className="panel space-y-4 p-6 text-center">
        <p className="font-display text-2xl font-black uppercase">Link expired</p>
        <p className="text-sm text-iron-400">This reset link is invalid or already used. Request a new one.</p>
        <Link href="/login" className="btn-volt">Back to log in</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="panel flex flex-col items-center gap-3 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-volt-400" />
        <p className="font-display text-3xl font-black uppercase">Password updated</p>
        <button type="button" className="btn-volt" onClick={() => router.replace("/welcome")}>Continue</button>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (pw !== pw2) return setError("The two passwords don't match.");
    setBusy(true);
    const err = await updatePassword(pw);
    setBusy(false);
    if (err) return setError(err);
    setDone(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="panel space-y-5 p-5 sm:p-8">
      <Field label="New password" htmlFor="pw">
        <input id="pw" type="password" className="field" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" />
      </Field>
      <Field label="Repeat new password" htmlFor="pw2">
        <input id="pw2" type="password" className="field" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      </Field>
      {error && <p role="alert" className="text-sm font-medium text-blood-400">{error}</p>}
      <button type="submit" disabled={busy} className="btn-volt w-full justify-center">
        {busy ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
