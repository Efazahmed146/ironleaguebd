"use client";

import { getAccount, saveEntry } from "@/lib/account";
import { MEET, applyGatewayPayment } from "@/lib/meet";
import { supabase } from "@/lib/supabase/client";

/** Asks our server to start an SSLCommerz checkout. On success the caller sends the browser to `url`. */
export async function startGatewayPayment(): Promise<{ url?: string; error?: string; alreadyPaid?: boolean }> {
  try {
    const res = await fetch("/api/payments/sslcommerz/init", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; message?: string };
    if (res.ok && data.url) return { url: data.url };
    if (data.error === "already_paid") return { alreadyPaid: true };
    return { error: data.message || "Couldn't start the payment. Try again." };
  } catch {
    return { error: "No connection. Check your internet and try again." };
  }
}

export interface PaidState {
  /** A confirmed payment exists and was applied to your entry. */
  paid: boolean;
  /** The gateway flagged a payment; staff are checking it. */
  held: boolean;
}

/**
 * Looks up YOUR payments in the database (written only by our server after the gateway
 * confirmed them) and, when one is paid, marks the entry fee as paid on this device.
 */
export async function syncPaidEntryFee(): Promise<PaidState> {
  const none: PaidState = { paid: false, held: false };
  try {
    const entry = getAccount().entry;
    if (!entry) return none;
    const { data, error } = await supabase()
      .from("entry_payments")
      .select("tran_id, amount_bdt, status, channel, bank_tran_id, paid_at")
      .eq("meet_id", MEET.id)
      .in("status", ["paid", "held"])
      .order("created_at", { ascending: false })
      .limit(5);
    if (error || !data) return none;
    const paid = data.find((r) => r.status === "paid");
    if (paid) {
      if (entry.payment?.status !== "approved" || entry.payment.tranId !== paid.tran_id) {
        saveEntry(
          applyGatewayPayment(entry, {
            tranId: paid.tran_id as string,
            amountBdt: Number(paid.amount_bdt),
            channel: paid.channel as string | null,
            bankTranId: paid.bank_tran_id as string | null,
            paidAt: paid.paid_at as string | null,
          }),
        );
      }
      return { paid: true, held: false };
    }
    return { paid: false, held: data.some((r) => r.status === "held") };
  } catch {
    return none;
  }
}
