/**
 * SSLCommerz client (server side only). Docs: https://developer.sslcommerz.com/doc/v4/
 *
 *  1. initSession(): ask SSLCommerz for a hosted checkout page for ONE payment.
 *  2. The customer pays there (cards, bKash, Nagad, Rocket, internet banking...).
 *  3. SSLCommerz calls our success / fail / cancel URLs (browser) and our IPN URL (server).
 *  4. validatePayment(): we ask SSLCommerz directly "is this val_id really paid, and for how
 *     much?". We never trust the data the browser or the IPN body hands us.
 */

export interface GatewayConfig {
  storeId: string;
  storePassword: string;
  live: boolean;
}

export function gatewayConfig(env: Record<string, string | undefined> = process.env): GatewayConfig | null {
  const storeId = env.SSLCOMMERZ_STORE_ID?.trim();
  const storePassword = env.SSLCOMMERZ_STORE_PASSWORD?.trim();
  if (!storeId || !storePassword) return null;
  return { storeId, storePassword, live: env.SSLCOMMERZ_LIVE === "true" };
}

const host = (c: GatewayConfig) => (c.live ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com");

/** Unique, URL-safe transaction id (SSLCommerz allows up to 30 characters). */
export function newTranId(now = Date.now(), rand = Math.random): string {
  const r = Math.floor(rand() * 36 ** 6)
    .toString(36)
    .toUpperCase()
    .padStart(6, "0");
  return `IL${now.toString(36).toUpperCase()}${r}`.slice(0, 30);
}

export interface Customer {
  name: string;
  email: string;
  phone: string;
  city?: string;
}

export interface InitInput {
  tranId: string;
  amountBdt: number;
  productName: string;
  userId: string;
  meetId: string;
  baseUrl: string;
  customer: Customer;
}

export function buildInitParams(c: GatewayConfig, i: InitInput): Record<string, string> {
  const cb = `${i.baseUrl.replace(/\/$/, "")}/api/payments/sslcommerz`;
  return {
    store_id: c.storeId,
    store_passwd: c.storePassword,
    total_amount: i.amountBdt.toFixed(2),
    currency: "BDT",
    tran_id: i.tranId,
    success_url: `${cb}/success`,
    fail_url: `${cb}/fail`,
    cancel_url: `${cb}/cancel`,
    ipn_url: `${cb}/ipn`,
    product_name: i.productName,
    product_category: "Competition entry",
    product_profile: "non-physical-goods",
    shipping_method: "NO",
    num_of_item: "1",
    cus_name: i.customer.name || "IronLeague lifter",
    cus_email: i.customer.email || "noreply@ironleague.bd",
    cus_add1: i.customer.city || "Dhaka",
    cus_city: i.customer.city || "Dhaka",
    cus_country: "Bangladesh",
    cus_phone: i.customer.phone || "01700000000",
    value_a: i.userId,
    value_b: i.meetId,
  };
}

type Fetch = typeof fetch;

export async function initSession(
  c: GatewayConfig,
  input: InitInput,
  fetchImpl: Fetch = fetch,
): Promise<{ ok: true; url: string } | { ok: false; reason: string }> {
  try {
    const res = await fetchImpl(`${host(c)}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(buildInitParams(c, input)).toString(),
      signal: AbortSignal.timeout(20_000),
    });
    const data = (await res.json()) as { status?: string; GatewayPageURL?: string; failedreason?: string };
    if (data.status === "SUCCESS" && data.GatewayPageURL) return { ok: true, url: data.GatewayPageURL };
    return { ok: false, reason: data.failedreason || "The payment gateway refused the request." };
  } catch {
    return { ok: false, reason: "Couldn't reach the payment gateway. Try again in a moment." };
  }
}

/** The fields we use from SSLCommerz's validation response. */
export interface Validation {
  status?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string;
  currency_type?: string;
  currency_amount?: string;
  bank_tran_id?: string;
  card_type?: string;
  risk_level?: string;
  risk_title?: string;
  [k: string]: unknown;
}

export async function validatePayment(
  c: GatewayConfig,
  valId: string,
  fetchImpl: Fetch = fetch,
): Promise<Validation | null> {
  try {
    const q = new URLSearchParams({ val_id: valId, store_id: c.storeId, store_passwd: c.storePassword, format: "json" });
    const res = await fetchImpl(`${host(c)}/validator/api/validationserverAPI.php?${q}`, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as Validation;
  } catch {
    return null;
  }
}

export type Verdict =
  | { kind: "paid"; channel: string; bankTranId: string }
  | { kind: "held"; reason: string }
  | { kind: "invalid"; reason: string };

/**
 * Decides whether a validation response is a genuine, complete payment for THIS order.
 * `expected` always comes from our database, never from the browser.
 */
export function judgeValidation(v: Validation | null, expected: { tranId: string; amountBdt: number }): Verdict {
  if (!v) return { kind: "invalid", reason: "Couldn't verify the payment with the gateway." };
  if (v.status !== "VALID" && v.status !== "VALIDATED") {
    return { kind: "invalid", reason: `Gateway status: ${String(v.status ?? "unknown")}.` };
  }
  if (v.tran_id !== expected.tranId) return { kind: "invalid", reason: "Transaction id doesn't match this order." };
  const paid = Number(v.currency_type === "BDT" ? (v.currency_amount ?? v.amount) : NaN);
  if (v.currency_type !== "BDT" || !Number.isFinite(paid)) {
    return { kind: "invalid", reason: "Payment wasn't made in BDT." };
  }
  if (paid + 0.001 < expected.amountBdt) {
    return { kind: "invalid", reason: `Paid ৳${paid}, expected ৳${expected.amountBdt}.` };
  }
  if (v.risk_level === "1") {
    return { kind: "held", reason: "The gateway flagged this payment as risky. It needs a manual check." };
  }
  return { kind: "paid", channel: String(v.card_type ?? ""), bankTranId: String(v.bank_tran_id ?? "") };
}
