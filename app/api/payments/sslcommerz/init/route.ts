import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gatewayConfig, initSession, newTranId } from "@/lib/payments/sslcommerz";
import { siteUrl } from "@/lib/payments/site-url";
import { MEET } from "@/lib/meet";

export const dynamic = "force-dynamic";

const err = (error: string, message: string, status: number) => NextResponse.json({ error, message }, { status });

/** Step 3: "Pay Entry Fee". Creates a pending payment and returns the SSLCommerz checkout URL. */
export async function POST(req: Request) {
  const cfg = gatewayConfig();
  const admin = createAdminClient();
  if (!cfg || !admin) {
    return err(
      "not_configured",
      "Online payment isn't switched on yet. The site owner needs to add the SSLCommerz keys (see SETUP-SUPABASE.md).",
      503,
    );
  }
  if (MEET.entryFeeBdt <= 0) return err("free", "This meet has no entry fee.", 400);

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return err("auth", "Please log in again.", 401);

  const { data: paid } = await admin
    .from("entry_payments")
    .select("tran_id")
    .eq("user_id", user.id)
    .eq("meet_id", MEET.id)
    .eq("status", "paid")
    .maybeSingle();
  if (paid) return err("already_paid", "You've already paid this entry fee.", 409);

  const { data: profile } = await sb.from("users").select("name, phone, district").eq("id", user.id).maybeSingle();

  // The amount is decided HERE, from our own config. The browser can't change the price.
  const tranId = newTranId();
  const { error: insErr } = await admin.from("entry_payments").insert({
    user_id: user.id,
    meet_id: MEET.id,
    tran_id: tranId,
    amount_bdt: MEET.entryFeeBdt,
    status: "pending",
  });
  if (insErr) {
    return err("db", "Couldn't start the payment. Did you run the newest supabase/setup.sql?", 500);
  }

  const session = await initSession(cfg, {
    tranId,
    amountBdt: MEET.entryFeeBdt,
    productName: `${MEET.name} entry fee`,
    userId: user.id,
    meetId: MEET.id,
    baseUrl: siteUrl(req),
    customer: {
      name: profile?.name || user.user_metadata?.name || "",
      email: user.email ?? "",
      phone: (profile?.phone ?? "").replace(/^\+?880/, "0"),
      city: profile?.district || "Dhaka",
    },
  });
  if (!session.ok) {
    await admin.from("entry_payments").update({ status: "failed", note: session.reason }).eq("tran_id", tranId);
    return err("gateway", session.reason, 502);
  }
  return NextResponse.json({ url: session.url });
}
