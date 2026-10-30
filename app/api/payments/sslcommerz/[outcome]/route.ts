import { NextResponse } from "next/server";
import { gatewayConfig, validatePayment } from "@/lib/payments/sslcommerz";
import { settleFailure, settleSuccess } from "@/lib/payments/settle";
import { supabasePaymentStore } from "@/lib/payments/store";
import { siteUrl } from "@/lib/payments/site-url";

export const dynamic = "force-dynamic";

async function bodyOf(req: Request): Promise<Record<string, string>> {
  try {
    if (req.method !== "POST") return Object.fromEntries(new URL(req.url).searchParams);
    const form = await req.formData();
    return Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  } catch {
    return {};
  }
}

/**
 * SSLCommerz sends the customer's browser back here (POST) after paying, failing or cancelling.
 * We verify with the gateway, update the database, then send the customer to the payment page.
 */
async function handle(req: Request, { params }: { params: Promise<{ outcome: string }> }) {
  const { outcome } = await params;
  const base = siteUrl(req);
  const to = (status: string) => NextResponse.redirect(`${base}/compete/payment?pay=${status}`, 303);

  const cfg = gatewayConfig();
  const store = supabasePaymentStore();
  if (!cfg || !store) return to("error");

  const body = await bodyOf(req);
  const tranId = body.tran_id ?? "";

  if (outcome === "success") {
    const r = await settleSuccess({ store, cfg, validate: validatePayment }, tranId, body.val_id);
    return to(r.status === "paid" ? "paid" : r.status === "held" ? "held" : "failed");
  }
  if (outcome === "fail" || outcome === "cancel") {
    const r = await settleFailure({ store }, tranId, outcome === "cancel" ? "cancelled" : "failed");
    return to(r.status === "paid" ? "paid" : outcome === "cancel" ? "cancelled" : "failed");
  }
  return to("error");
}

export { handle as GET, handle as POST };
