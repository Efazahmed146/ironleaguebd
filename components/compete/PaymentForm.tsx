"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Loader2, Lock, XCircle } from "lucide-react";
import { saveEntry, useAccount, useIsClient } from "@/lib/account";
import { MEET, demoPay, feeRequired, paymentLabel, type MeetEntry } from "@/lib/meet";
import { startGatewayPayment, syncPaidEntryFee } from "@/lib/payments/client";

type Back = "paid" | "failed" | "cancelled" | "held" | "error" | null;

const METHODS = ["bKash", "Nagad", "Rocket", "Visa / Mastercard", "Internet banking"];

export function PaymentForm() {
  const ready = useIsClient();
  const { profile, entry } = useAccount();
  if (!ready || !profile) return null;
  if (!entry) {
    return (
      <div className="panel flex flex-col items-center gap-4 px-6 py-12 text-center">
        <p className="font-display text-3xl font-black uppercase">Pick your category first</p>
        <Link href="/compete/register" className="btn-volt">
          Choose category
        </Link>
      </div>
    );
  }
  return <PaymentInner entry={entry} />;
}

function PaymentInner({ entry }: { entry: MeetEntry }) {
  const router = useRouter();
  const p = entry.payment;
  const [back, setBack] = useState<Back>(null);
  const [held, setHeld] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Coming back from the gateway (?pay=paid|failed|cancelled|held): show the result, then tidy the URL.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("pay") as Back;
    if (q) {
      setBack(q);
      window.history.replaceState(null, "", window.location.pathname);
    }
    let alive = true;
    (async () => {
      // Confirmed payments are read from the database. Retry briefly in case the webhook lands a moment later.
      for (let i = 0; i < (q === "paid" ? 4 : 1); i++) {
        const r = await syncPaidEntryFee();
        if (!alive) return;
        setHeld(r.held);
        if (r.paid) return setBack(q ? "paid" : null);
        await new Promise((res) => setTimeout(res, 1500));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function onPay() {
    setBusy(true);
    setError("");
    setBack(null);
    const r = await startGatewayPayment();
    if (r.url) {
      window.location.assign(r.url); // off to SSLCommerz's secure checkout
      return;
    }
    if (r.alreadyPaid) {
      await syncPaidEntryFee();
      setBusy(false);
      return;
    }
    setError(r.error ?? "Couldn't start the payment.");
    setBusy(false);
  }

  function onSkip() {
    saveEntry(demoPay(entry));
    router.push("/compete");
  }

  if (!feeRequired()) {
    return (
      <div className="panel space-y-3 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-volt-400" />
        <p className="font-display text-3xl font-black uppercase">Free entry</p>
        <p className="text-sm text-iron-400">This meet has no entry fee. Nothing to pay.</p>
        <Link href="/compete" className="btn-volt">
          Back to hub
        </Link>
      </div>
    );
  }

  if (p?.status === "approved") {
    return (
      <div className="panel space-y-3 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-volt-400" />
        <p className="font-display text-3xl font-black uppercase">Entry fee confirmed</p>
        <p className="text-sm text-iron-300">{paymentLabel(p)}</p>
        {p.trxId && <p className="break-all text-xs text-iron-500">Ref {p.trxId}</p>}
        <p className="text-sm text-iron-400">Step 4 is unlocked. Go lift!</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/compete/attempts" className="btn-volt">
            Go to my attempts
          </Link>
          <Link href="/compete" className="btn-ghost">
            Back to hub
          </Link>
        </div>
      </div>
    );
  }

  const banner =
    back === "failed" || back === "error"
      ? { tone: "bad", icon: XCircle, text: "Payment failed. You weren't charged, or the money will return to you. Please try again." }
      : back === "cancelled"
        ? { tone: "bad", icon: XCircle, text: "You cancelled the payment. Nothing was charged. You can try again any time." }
        : back === "held" || held
          ? { tone: "wait", icon: Clock, text: "Your payment is being checked by our team. It will unlock soon. You don't need to pay again." }
          : back === "paid"
            ? { tone: "wait", icon: Clock, text: "Payment received. Confirming it now…" }
            : null;

  return (
    <div className="space-y-6">
      {banner && (
        <div
          role={banner.tone === "bad" ? "alert" : "status"}
          className={`flex items-start gap-3 rounded-xl p-4 ring-1 ${
            banner.tone === "bad" ? "bg-blood-500/10 ring-blood-500/40" : "bg-iron-900 ring-iron-700"
          }`}
        >
          <banner.icon
            className={`mt-0.5 h-5 w-5 shrink-0 ${banner.tone === "bad" ? "text-blood-400" : "text-volt-400"}`}
          />
          <p className="text-sm text-iron-200">{banner.text}</p>
        </div>
      )}

      <div className="panel space-y-6 p-5 sm:p-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-stencil text-iron-500">Entry fee</p>
          <p className="font-display text-6xl font-black leading-none text-volt-400">৳{MEET.entryFeeBdt}</p>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-stencil text-iron-500">You can pay with</p>
          <div className="flex flex-wrap gap-1.5">
            {METHODS.map((m) => (
              <span key={m} className="chip bg-iron-900 text-iron-300 ring-iron-700">
                {m}
              </span>
            ))}
          </div>
        </div>

        <p className="flex items-start gap-2 rounded-xl bg-iron-950 p-4 text-sm text-iron-300 ring-1 ring-iron-800">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-volt-400" />
          <span>
            You&apos;ll go to SSLCommerz&apos;s secure payment page. We never see your card, PIN or OTP. When the payment
            succeeds, your entry fee is confirmed <b>automatically</b> and the next step unlocks right away.
          </span>
        </p>

        {error && (
          <p role="alert" className="text-sm font-medium text-blood-400">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onPay} disabled={busy} className="btn-volt">
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
              </>
            ) : back === "failed" || back === "cancelled" || back === "error" ? (
              "Try payment again"
            ) : (
              "Pay Entry Fee"
            )}
          </button>
          <Link href="/compete" className="btn-ghost">
            Back
          </Link>
        </div>
      </div>

      {MEET.demoSkips && (
        <div className="rounded-xl bg-amber-300/10 p-4 ring-1 ring-amber-300/40">
          <p className="mb-2 text-xs text-amber-100">Demo version: no real payment needed to test the next steps.</p>
          <button type="button" onClick={onSkip} className="btn-ghost !py-2 text-sm">
            Skip payment (demo only)
          </button>
        </div>
      )}
    </div>
  );
}
