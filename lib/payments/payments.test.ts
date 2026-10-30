import { test } from "node:test";
import assert from "node:assert/strict";
import { buildInitParams, gatewayConfig, judgeValidation, newTranId, initSession, validatePayment, type Validation } from "./sslcommerz";
import { settleFailure, settleIpn, settleSuccess, type PaymentRow, type PaymentStore, type PayStatus } from "./settle";
import { siteUrl } from "./site-url";
import { applyGatewayPayment, paymentLabel, isOfficial, type MeetEntry } from "../meet";

const cfg = { storeId: "teststore", storePassword: "secret", live: false };
const good = (o: Partial<Validation> = {}): Validation => ({
  status: "VALID",
  tran_id: "IL1",
  val_id: "V1",
  amount: "300.00",
  currency_type: "BDT",
  currency_amount: "300.00",
  bank_tran_id: "BANK123",
  card_type: "BKASH-BKash",
  risk_level: "0",
  ...o,
});

function fakeStore(row: Partial<PaymentRow> | null, opts: { conflictOnPaid?: boolean } = {}) {
  const state = row ? { tran_id: "IL1", user_id: "u1", meet_id: "m", amount_bdt: "300.00", status: "pending" as PayStatus, ...row } : null;
  const patches: Record<string, unknown>[] = [];
  const store: PaymentStore = {
    async get() {
      return state ? { ...state } : null;
    },
    async update(_t, patch, onlyIf) {
      if (!state || !onlyIf.includes(state.status)) return { changed: false };
      if (patch.status === "paid" && opts.conflictOnPaid) return { changed: false, conflict: true };
      patches.push(patch);
      Object.assign(state, patch);
      return { changed: true };
    },
  };
  return { store, state, patches };
}
const deps = (store: PaymentStore, v: Validation | null) => ({ store, cfg, validate: async () => v });

test("config needs both keys; sandbox unless SSLCOMMERZ_LIVE=true", () => {
  assert.equal(gatewayConfig({}), null);
  assert.equal(gatewayConfig({ SSLCOMMERZ_STORE_ID: "a" }), null);
  assert.deepEqual(gatewayConfig({ SSLCOMMERZ_STORE_ID: "a", SSLCOMMERZ_STORE_PASSWORD: "b" }), { storeId: "a", storePassword: "b", live: false });
  assert.equal(gatewayConfig({ SSLCOMMERZ_STORE_ID: "a", SSLCOMMERZ_STORE_PASSWORD: "b", SSLCOMMERZ_LIVE: "true" })!.live, true);
});

test("tran ids are unique-looking, URL safe, <= 30 chars", () => {
  const ids = new Set(Array.from({ length: 200 }, () => newTranId()));
  assert.ok(ids.size > 190);
  for (const id of ids) assert.match(id, /^[A-Z0-9]{8,30}$/);
});

test("init params carry the server-decided amount and callback URLs", () => {
  const p = buildInitParams(cfg, {
    tranId: "IL1", amountBdt: 300, productName: "Entry", userId: "u1", meetId: "m", baseUrl: "https://x.app/",
    customer: { name: "Rakib", email: "r@x.com", phone: "01712345678" },
  });
  assert.equal(p.total_amount, "300.00");
  assert.equal(p.currency, "BDT");
  assert.equal(p.success_url, "https://x.app/api/payments/sslcommerz/success");
  assert.equal(p.ipn_url, "https://x.app/api/payments/sslcommerz/ipn");
  assert.equal(p.shipping_method, "NO");
});

test("initSession returns the checkout URL, or the gateway's reason", async () => {
  const ok = async () => new Response(JSON.stringify({ status: "SUCCESS", GatewayPageURL: "https://pay/x" }));
  const bad = async () => new Response(JSON.stringify({ status: "FAILED", failedreason: "Invalid Store" }));
  const input = { tranId: "IL1", amountBdt: 300, productName: "E", userId: "u", meetId: "m", baseUrl: "https://x", customer: { name: "", email: "", phone: "" } };
  assert.deepEqual(await initSession(cfg, input, ok as unknown as typeof fetch), { ok: true, url: "https://pay/x" });
  assert.deepEqual(await initSession(cfg, input, bad as unknown as typeof fetch), { ok: false, reason: "Invalid Store" });
  const boom = async () => { throw new Error("net"); };
  assert.equal((await initSession(cfg, input, boom as unknown as typeof fetch)).ok, false);
});

test("validatePayment calls the validator with the val_id", async () => {
  let seen = "";
  const f = async (u: string | URL | Request) => { seen = String(u); return new Response(JSON.stringify(good())); };
  const v = await validatePayment(cfg, "V1", f as unknown as typeof fetch);
  assert.equal(v?.status, "VALID");
  assert.match(seen, /sandbox\.sslcommerz\.com\/validator\/api\/validationserverAPI\.php\?/);
  assert.match(seen, /val_id=V1/);
});

test("judgeValidation: accepts only a genuine, full BDT payment for this order", () => {
  const exp = { tranId: "IL1", amountBdt: 300 };
  assert.equal(judgeValidation(good(), exp).kind, "paid");
  assert.equal(judgeValidation(good({ status: "VALIDATED" }), exp).kind, "paid");
  assert.equal(judgeValidation(null, exp).kind, "invalid");
  assert.equal(judgeValidation(good({ status: "INVALID_TRANSACTION" }), exp).kind, "invalid");
  assert.equal(judgeValidation(good({ tran_id: "OTHER" }), exp).kind, "invalid");
  assert.equal(judgeValidation(good({ currency_amount: "100.00" }), exp).kind, "invalid"); // underpaid
  assert.equal(judgeValidation(good({ currency_type: "USD" }), exp).kind, "invalid");
  assert.equal(judgeValidation(good({ risk_level: "1" }), exp).kind, "held");
  assert.equal(judgeValidation(good({ currency_amount: "350.00" }), exp).kind, "paid"); // overpay is fine
});

test("success callback marks paid, and a repeat (IPN) is harmless", async () => {
  const { store, state } = fakeStore({});
  const r = await settleSuccess(deps(store, good()), "IL1", "V1");
  assert.equal(r.status, "paid");
  assert.equal(state!.status, "paid");
  assert.equal((state as Record<string, unknown>).val_id, "V1");
  assert.equal((state as Record<string, unknown>).channel, "BKASH-BKash");
  const again = await settleSuccess(deps(store, null), "IL1", "V1"); // gateway not even asked
  assert.equal(again.status, "paid");
});

test("a forged success (bad validation, wrong amount, no val_id) never unlocks", async () => {
  for (const [v, val] of [[null, "V1"], [good({ status: "FAILED" }), "V1"], [good({ currency_amount: "1.00" }), "V1"], [good(), undefined]] as const) {
    const { store, state } = fakeStore({});
    const r = await settleSuccess(deps(store, v), "IL1", val);
    assert.equal(r.status, "failed");
    assert.equal(state!.status, "failed");
  }
});

test("unknown order is ignored", async () => {
  const { store } = fakeStore(null);
  assert.equal((await settleSuccess(deps(store, good()), "NOPE", "V1")).status, "unknown");
});

test("a failed attempt can still be paid later (retry with the same order)", async () => {
  const { store, state } = fakeStore({ status: "failed" });
  assert.equal((await settleSuccess(deps(store, good()), "IL1", "V1")).status, "paid");
  assert.equal(state!.status, "paid");
});

test("risky payments are held, not unlocked", async () => {
  const { store, state } = fakeStore({});
  const r = await settleSuccess(deps(store, good({ risk_level: "1" })), "IL1", "V1");
  assert.equal(r.status, "held");
  assert.equal(state!.status, "held");
});

test("a second payment for the same meet is held for refund", async () => {
  const { store, state } = fakeStore({}, { conflictOnPaid: true });
  const r = await settleSuccess(deps(store, good()), "IL1", "V1");
  assert.equal(r.status, "held");
  assert.equal(state!.status, "held");
});

test("fail / cancel only touch pending orders and never un-pay", async () => {
  const a = fakeStore({});
  assert.equal((await settleFailure({ store: a.store }, "IL1", "cancelled")).status, "cancelled");
  assert.equal(a.state!.status, "cancelled");
  const b = fakeStore({ status: "paid" });
  assert.equal((await settleFailure({ store: b.store }, "IL1", "failed")).status, "paid");
  assert.equal(b.state!.status, "paid");
});

test("IPN routes by gateway status", async () => {
  const a = fakeStore({});
  assert.equal((await settleIpn(deps(a.store, good()), { tran_id: "IL1", status: "VALID", val_id: "V1" })).status, "paid");
  const b = fakeStore({});
  assert.equal((await settleIpn(deps(b.store, good()), { tran_id: "IL1", status: "FAILED" })).status, "failed");
  const c = fakeStore({});
  assert.equal((await settleIpn(deps(c.store, good()), { tran_id: "IL1", status: "CANCELLED" })).status, "cancelled");
  const d = fakeStore({});
  assert.equal((await settleIpn(deps(d.store, good()), { tran_id: "IL1", status: "PENDING" })).status, "unknown");
  assert.equal(d.state!.status, "pending");
});

test("site url prefers the env var, then forwarded headers", () => {
  const req = (h: Record<string, string>) => ({ url: "http://localhost:3000/x", headers: { get: (k: string) => h[k.toLowerCase()] ?? null } });
  assert.equal(siteUrl(req({}), { NEXT_PUBLIC_SITE_URL: "https://a.app/" } as never), "https://a.app");
  assert.equal(siteUrl(req({ host: "localhost:3000" }), {} as never), "http://localhost:3000");
  assert.equal(siteUrl(req({ "x-forwarded-host": "b.app", "x-forwarded-proto": "https" }), {} as never), "https://b.app");
});

test("a confirmed gateway payment unlocks the entry fee", () => {
  const entry = { meetId: "m", experience: "novice", weightClass: "-83", registeredAt: "", weighInCode: "", attempts: { squat: [], bench: [], deadlift: [] } } as MeetEntry;
  const paid = applyGatewayPayment(entry, { tranId: "IL1", amountBdt: 300, channel: "BKASH-BKash", bankTranId: "BANK123", paidAt: "2026-10-30T00:00:00Z" });
  assert.equal(paid.payment!.status, "approved");
  assert.equal(paid.payment!.method, "gateway");
  assert.equal(paid.payment!.trxId, "BANK123");
  assert.equal(paymentLabel(paid.payment!), "৳300 via BKash");
  assert.equal(isOfficial({ ...paid, weighIn: { status: "approved" } as never }), true);
});
