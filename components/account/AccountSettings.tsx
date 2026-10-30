"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getAccount, saveProfile } from "@/lib/account";
import { useAuth } from "@/lib/auth";
import { setMode } from "@/lib/mode";
import { formatBdPhone, normalizeBdPhone } from "@/lib/phone";
import { Field } from "@/components/ui/Field";
import { ProBadge } from "./ProBadge";

type Msg = { ok: boolean; text: string } | null;

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel space-y-4 p-5 sm:p-6">
      <h2 className="font-display text-2xl font-extrabold uppercase">{title}</h2>
      {children}
    </section>
  );
}

const Note = ({ m }: { m: Msg }) =>
  m ? <p role={m.ok ? "status" : "alert"} className={`text-sm font-medium ${m.ok ? "text-volt-300" : "text-blood-400"}`}>{m.text}</p> : null;

/** Change name, email and password; log out. Signed-in users only. */
export function AccountSettings() {
  const router = useRouter();
  const { ready, user, cloud, isPro, updateAccount, updatePassword, requestPasswordReset, logout } = useAuth();

  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneMsg, setPhoneMsg] = useState<Msg>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [nameMsg, setNameMsg] = useState<Msg>(null);
  const [emailMsg, setEmailMsg] = useState<Msg>(null);
  const [pwMsg, setPwMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState("");

  if (!ready || !user) {
    return ready ? (
      <div className="panel p-8 text-center"><Link href="/login" className="btn-volt">Log in</Link></div>
    ) : (
      <div className="panel h-72 animate-pulse-glow" aria-hidden />
    );
  }

  const shownName = name ?? cloud?.name ?? "";
  // People who signed in with Google / Facebook have no password yet; setting one is optional.
  const usesPassword = user.app_metadata?.providers?.some((p: string) => p === "email" || p === "phone");

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setNameMsg(null);
    if (shownName.trim().length < 2) return setNameMsg({ ok: false, text: "Enter your name." });
    setBusy("name");
    const r = await updateAccount({ name: shownName });
    setBusy("");
    if (r.error) return setNameMsg({ ok: false, text: r.error });
    const p = getAccount().profile;
    if (p) saveProfile({ ...p, name: shownName.trim() });
    setNameMsg({ ok: true, text: "Name updated." });
  }

  async function saveEmail(e: FormEvent) {
    e.preventDefault();
    setEmailMsg(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setEmailMsg({ ok: false, text: "Enter a valid email." });
    setBusy("email");
    const r = await updateAccount({ email });
    setBusy("");
    if (r.error) return setEmailMsg({ ok: false, text: r.error });
    setEmailMsg({ ok: true, text: `We sent a confirmation link to ${email.trim()}. Your email changes after you open it (you may also need to confirm from your old email).` });
    setEmail("");
  }

  async function savePhone(e: FormEvent) {
    e.preventDefault();
    setPhoneMsg(null);
    const e164 = normalizeBdPhone(phone);
    if (!e164) return setPhoneMsg({ ok: false, text: "Enter a valid mobile number, e.g. 01712345678." });
    setBusy("phone");
    const r = await updateAccount({ phone: e164 });
    setBusy("");
    if (r.error) return setPhoneMsg({ ok: false, text: r.error });
    setPhoneMsg({ ok: true, text: `Saved ${formatBdPhone(e164)}.` });
    setPhone("");
  }

  async function savePw(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pw.length < 8) return setPwMsg({ ok: false, text: "Use at least 8 characters." });
    if (pw !== pw2) return setPwMsg({ ok: false, text: "The two passwords don't match." });
    setBusy("pw");
    const err = await updatePassword(pw);
    setBusy("");
    if (err) return setPwMsg({ ok: false, text: err });
    setPw("");
    setPw2("");
    setPwMsg({ ok: true, text: "Password updated." });
  }

  async function emailMeALink() {
    setPwMsg(null);
    const err = await requestPasswordReset(user!.email ?? "");
    setPwMsg(err ? { ok: false, text: err } : { ok: true, text: "Reset link sent to your email." });
  }

  async function onLogout() {
    await logout();
    setMode(null);
    router.push("/");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm text-iron-300">
        <span className="min-w-0 break-all">Signed in as <b className="text-iron-50">{user.email || formatBdPhone(user.phone ? `+${user.phone.replace(/^\+/, "")}` : null) || cloud?.name}</b></span>
        {isPro && <ProBadge />}
      </div>

      <Card title="Name">
        <form onSubmit={saveName} className="space-y-3" noValidate>
          <Field label="Full name" htmlFor="acc-name">
            <input id="acc-name" className="field" autoComplete="name" value={shownName} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Note m={nameMsg} />
          <button type="submit" disabled={busy === "name"} className="btn-volt !py-2 text-sm">{busy === "name" ? "Saving…" : "Save name"}</button>
        </form>
        <p className="text-xs text-iron-500">
          Age, district, bodyweight, gym and photo are on your <Link href="/join" className="text-volt-400 underline">profile page</Link>.
        </p>
      </Card>

      <Card title="Email">
        <form onSubmit={saveEmail} className="space-y-3" noValidate>
          <Field label="New email" htmlFor="acc-email">
            <input id="acc-email" type="email" className="field" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={user.email ?? "you@email.com"} />
          </Field>
          <Note m={emailMsg} />
          <button type="submit" disabled={busy === "email"} className="btn-volt !py-2 text-sm">{busy === "email" ? "Sending…" : "Change email"}</button>
        </form>
      </Card>

      <Card title="Mobile number">
        <form onSubmit={savePhone} className="space-y-3" noValidate>
          <Field label="Mobile number" htmlFor="acc-phone">
            <input id="acc-phone" type="tel" inputMode="tel" className="field" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={formatBdPhone(cloud?.phone) || "01712345678"} />
          </Field>
          <p className="text-xs text-iron-500">Saved to your account. Other lifters never see it.</p>
          <Note m={phoneMsg} />
          <button type="submit" disabled={busy === "phone"} className="btn-volt !py-2 text-sm">{busy === "phone" ? "Saving…" : "Save number"}</button>
        </form>
      </Card>

      <Card title={usesPassword ? "Password" : "Set a password"}>
        {!usesPassword && (
          <p className="text-sm text-iron-400">You signed in with a social account. You can also add a password to log in with your email.</p>
        )}
        <form onSubmit={savePw} className="space-y-3" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password" htmlFor="acc-pw">
              <input id="acc-pw" type="password" className="field" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" />
            </Field>
            <Field label="Repeat new password" htmlFor="acc-pw2">
              <input id="acc-pw2" type="password" className="field" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </Field>
          </div>
          <Note m={pwMsg} />
          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={busy === "pw"} className="btn-volt !py-2 text-sm">{busy === "pw" ? "Saving…" : "Update password"}</button>
            {user.email && <button type="button" onClick={emailMeALink} className="text-sm font-semibold text-volt-400 hover:text-volt-300">Email me a reset link instead</button>}
          </div>
        </form>
      </Card>

      <button type="button" onClick={onLogout} className="btn-ghost !text-blood-400">
        <LogOut className="h-4 w-4" /> Log out
      </button>
    </div>
  );
}
