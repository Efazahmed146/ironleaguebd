"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Crown, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { MEET } from "@/lib/meet";
import { activateDemoPro } from "@/lib/subscription-demo";
import { PAY_TO, PLANS, PRO_PERKS, type Plan } from "@/lib/plans";
import { Field } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { ProBadge } from "@/components/account/ProBadge";

const BN = "০১২৩৪৫৬৭৮৯";
const ascii = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));

interface Req {
  id: string;
  plan: Plan["id"];
  method: "bkash" | "nagad";
  trx_id: string;
  amount_bdt: number;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  created_at: string;
}

export function SubscribeForm() {
  const { ready, user, cloud, isPro, refresh } = useAuth();
  const [plan, setPlan] = useState<Plan["id"]>("season");
  const [method, setMethod] = useState<"bkash" | "nagad">("bkash");
  const [sender, setSender] = useState("");
  const [trx, setTrx] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoErr, setDemoErr] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase()
      .from("subscription_requests")
      .select("id,plan,method,trx_id,amount_bdt,status,note,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setReqs((data as Req[] | null) ?? []);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!ready || !user) return <div className="panel h-72 animate-pulse-glow" aria-hidden />;

  const chosen = PLANS.find((p) => p.id === plan)!;
  const pending = reqs.find((r) => r.status === "pending");
  const rejected = !pending ? reqs.find((r) => r.status === "rejected") : undefined;
  const payNumber = method === "bkash" ? PAY_TO.bkash : PAY_TO.nagad;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const phone = ascii(sender).replace(/\D/g, "");
    const trxId = trx.trim().toUpperCase();
    if (!/^01[3-9]\d{8}$/.test(phone)) errs.sender = "Enter the 11-digit number you paid from (01XXXXXXXXX).";
    if (!/^[A-Z0-9]{6,14}$/.test(trxId)) errs.trx = "Enter the TrxID from the payment SMS.";
    setErrors(errs);
    setFormError("");
    if (Object.keys(errs).length) return;

    setBusy(true);
    const { error } = await supabase().from("subscription_requests").insert({
      user_id: user!.id,
      plan: chosen.id,
      method,
      sender_number: phone,
      trx_id: trxId,
      amount_bdt: chosen.priceBdt,
    });
    setBusy(false);
    if (error) {
      setFormError(
        error.code === "23505"
          ? "That TrxID was already submitted."
          : error.message.includes("Amount")
            ? "The plan price changed. Reload the page and try again."
            : "Couldn't submit. Check your internet and try again.",
      );
      return;
    }
    setSender("");
    setTrx("");
    await load();
  }

  async function onDemo() {
    setDemoErr("");
    setDemoBusy(true);
    const err = await activateDemoPro();
    if (err) setDemoErr(err);
    else await refresh();
    setDemoBusy(false);
  }

  return (
    <div className="space-y-6">
      {MEET.demoSkips && !isPro && (
        <div className="rounded-xl bg-amber-300/10 p-4 ring-1 ring-amber-300/40">
          <p className="mb-2 text-sm text-amber-100">
            Demo version: skip the payment and get Pro for 30 days to test everything.
          </p>
          <button type="button" onClick={onDemo} disabled={demoBusy} className="btn-volt !py-2 text-sm">
            <Crown className="h-4 w-4" /> {demoBusy ? "Activating…" : "Skip payment: activate Pro (demo only)"}
          </button>
          {demoErr && <p role="alert" className="mt-2 text-sm text-blood-400">{demoErr}</p>}
        </div>
      )}

      {isPro && (
        <div className="panel flex flex-col items-center gap-3 p-6 text-center ring-1 ring-amber-300/40">
          <Crown className="h-10 w-10 text-amber-300" />
          <ProBadge />
          <p className="font-display text-3xl font-black uppercase">You&apos;re Pro</p>
          <p className="text-sm text-iron-300">
            {cloud?.subscribed_until
              ? `Active until ${new Date(cloud.subscribed_until).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}. `
              : ""}
            Renewing below adds time to your current plan.
          </p>
          <Link href="/compete" className="btn-volt">Go to my meet</Link>
        </div>
      )}

      {pending && (
        <div className="flex items-start gap-3 rounded-xl bg-iron-900 p-4 ring-1 ring-iron-700">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-volt-400" />
          <p className="text-sm text-iron-200">
            <b>Payment submitted</b> (TrxID {pending.trx_id}, ৳{pending.amount_bdt}). An admin will confirm it
            against the {pending.method === "bkash" ? "bKash" : "Nagad"} statement, then your Pro badge turns on
            automatically. <button type="button" className="font-semibold text-volt-400 underline" onClick={() => { void refresh(); void load(); }}>Check again</button>
          </p>
        </div>
      )}
      {rejected && (
        <div className="flex items-start gap-3 rounded-xl bg-blood-500/10 p-4 ring-1 ring-blood-500/40">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-blood-400" />
          <p className="text-sm text-iron-200">
            <b>Payment rejected.</b> {rejected.note ? `Reason: ${rejected.note}. ` : ""}Submit it again below.
          </p>
        </div>
      )}

      {!pending && (
        <form onSubmit={onSubmit} noValidate className="panel space-y-6 p-5 sm:p-8">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-stencil text-iron-500">Choose a plan</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlan(p.id)}
                  aria-pressed={plan === p.id}
                  className={`rounded-xl p-4 text-left ring-1 transition ${
                    plan === p.id ? "bg-amber-300/10 ring-amber-300/60" : "bg-iron-950 ring-iron-800 hover:ring-iron-600"
                  }`}
                >
                  <p className="font-display text-2xl font-extrabold uppercase">{p.label}</p>
                  <p className="font-display text-4xl font-black text-amber-300">৳{p.priceBdt}</p>
                  <p className="text-xs text-iron-400">{p.blurb}</p>
                </button>
              ))}
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-iron-400">
              {PRO_PERKS.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>

          <Segmented<"bkash" | "nagad">
            label="Pay with"
            value={method}
            onChange={setMethod}
            options={[{ id: "bkash", label: "bKash" }, { id: "nagad", label: "Nagad" }]}
          />

          <div className="rounded-xl bg-iron-950 p-4 text-sm text-iron-300 ring-1 ring-iron-800">
            <p>
              1. Open {method === "bkash" ? "bKash" : "Nagad"} → <b>Send Money</b> ৳{chosen.priceBdt} to{" "}
              <b className="font-display text-xl tabular-nums text-volt-300">{payNumber}</b>.
            </p>
            <p className="mt-1">2. Copy the <b>TrxID</b> from the confirmation SMS and enter it below.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Number you paid from" htmlFor="sender" error={errors.sender}>
              <input id="sender" className="field" inputMode="numeric" autoComplete="tel" value={sender} onChange={(e) => setSender(e.target.value)} placeholder="01XXXXXXXXX" />
            </Field>
            <Field label="Transaction ID (TrxID)" htmlFor="trx" error={errors.trx}>
              <input id="trx" className="field uppercase" value={trx} onChange={(e) => setTrx(e.target.value)} placeholder="e.g. 9K3L2M1N0P" />
            </Field>
          </div>

          {formError && <p role="alert" className="text-sm font-medium text-blood-400">{formError}</p>}
          <button type="submit" disabled={busy} className="btn-volt">
            {busy ? "Submitting…" : `Submit payment · ৳${chosen.priceBdt}`}
          </button>
        </form>
      )}

      {reqs.some((r) => r.status === "approved") && !isPro && (
        <p className="flex items-center gap-2 text-sm text-iron-400">
          <CheckCircle2 className="h-4 w-4" /> Your last plan has expired. Renew above.
        </p>
      )}
    </div>
  );
}
