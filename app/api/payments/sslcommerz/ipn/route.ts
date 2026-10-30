import { NextResponse } from "next/server";
import { gatewayConfig, validatePayment } from "@/lib/payments/sslcommerz";
import { settleIpn } from "@/lib/payments/settle";
import { supabasePaymentStore } from "@/lib/payments/store";

export const dynamic = "force-dynamic";

/**
 * Webhook (IPN). SSLCommerz calls this server-to-server, even if the customer closed the
 * browser before coming back. It does the same verified settle as the success URL, so a paid
 * order is always unlocked. Needs a public https URL (see SETUP-SUPABASE.md for local testing).
 */
export async function POST(req: Request) {
  const cfg = gatewayConfig();
  const store = supabasePaymentStore();
  if (!cfg || !store) return NextResponse.json({ ok: false }, { status: 503 });

  let body: Record<string, string> = {};
  try {
    const form = await req.formData();
    body = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const r = await settleIpn({ store, cfg, validate: validatePayment }, body);
  return NextResponse.json({ ok: true, status: r.status });
}
