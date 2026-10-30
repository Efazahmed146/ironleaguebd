import { judgeValidation, type GatewayConfig, type Validation } from "./sslcommerz";

/**
 * Turns a gateway callback into a database state. This is the ONLY place a payment becomes
 * "paid", and only after SSLCommerz itself confirms it (never from what the browser says).
 * The storage and the gateway call are injected so the rules can be unit-tested.
 */

export type PayStatus = "pending" | "paid" | "failed" | "cancelled" | "held";

export interface PaymentRow {
  tran_id: string;
  user_id: string;
  meet_id: string;
  amount_bdt: number | string;
  status: PayStatus;
}

export interface PaymentStore {
  get(tranId: string): Promise<PaymentRow | null>;
  /** Updates the row only when its current status is in `onlyIf`. Reports a unique-index clash as `conflict`. */
  update(
    tranId: string,
    patch: Record<string, unknown>,
    onlyIf: PayStatus[],
  ): Promise<{ changed: boolean; conflict?: boolean }>;
}

export interface SettleDeps {
  store: PaymentStore;
  cfg: GatewayConfig;
  validate: (cfg: GatewayConfig, valId: string) => Promise<Validation | null>;
  now?: () => Date;
}

export interface Settled {
  status: PayStatus | "unknown";
  message: string;
}

const ANY_OPEN: PayStatus[] = ["pending", "failed", "cancelled", "held"];

/** The customer came back from the gateway (success URL) or the gateway pinged our IPN URL. */
export async function settleSuccess(deps: SettleDeps, tranId: string, valId: string | undefined): Promise<Settled> {
  const { store, cfg, validate } = deps;
  const now = (deps.now ?? (() => new Date()))().toISOString();
  const row = tranId ? await store.get(tranId) : null;
  if (!row) return { status: "unknown", message: "We couldn't find that payment." };
  if (row.status === "paid") return { status: "paid", message: "Payment already confirmed." }; // callback + IPN both arrive

  if (!valId) {
    await store.update(tranId, { status: "failed", note: "No validation id from the gateway.", updated_at: now }, ["pending"]);
    return { status: "failed", message: "The gateway didn't confirm the payment." };
  }

  const verdict = judgeValidation(await validate(cfg, valId), {
    tranId,
    amountBdt: Number(row.amount_bdt),
  });

  if (verdict.kind === "paid") {
    const res = await store.update(
      tranId,
      {
        status: "paid",
        val_id: valId,
        bank_tran_id: verdict.bankTranId || null,
        channel: verdict.channel || null,
        paid_at: now,
        updated_at: now,
        note: null,
      },
      ANY_OPEN,
    );
    if (res.conflict) {
      // Unique index: this lifter already has a paid entry fee for this meet (or val_id reused).
      await store.update(
        tranId,
        { status: "held", note: "Duplicate payment: refund needed.", updated_at: now },
        ANY_OPEN,
      );
      return { status: "held", message: "You've already paid this entry fee. The extra payment will be refunded." };
    }
    return { status: "paid", message: "Payment confirmed." };
  }

  if (verdict.kind === "held") {
    await store.update(tranId, { status: "held", val_id: valId, note: verdict.reason, updated_at: now }, ["pending", "failed", "cancelled"]);
    return { status: "held", message: "Your payment is being checked by our team." };
  }

  await store.update(tranId, { status: "failed", note: verdict.reason, updated_at: now }, ["pending"]);
  return { status: "failed", message: verdict.reason };
}

/** Customer's payment failed or they cancelled. Never downgrades a payment that is already paid. */
export async function settleFailure(
  deps: Pick<SettleDeps, "store" | "now">,
  tranId: string,
  kind: "failed" | "cancelled",
): Promise<Settled> {
  const now = (deps.now ?? (() => new Date()))().toISOString();
  const row = tranId ? await deps.store.get(tranId) : null;
  if (!row) return { status: "unknown", message: "We couldn't find that payment." };
  if (row.status === "paid") return { status: "paid", message: "Payment already confirmed." };
  await deps.store.update(tranId, { status: kind, updated_at: now }, ["pending"]);
  return {
    status: kind,
    message: kind === "cancelled" ? "You cancelled the payment." : "The payment didn't go through.",
  };
}

/** Routes an IPN (server-to-server) body to the right handler. */
export async function settleIpn(deps: SettleDeps, body: Record<string, string>): Promise<Settled> {
  const tranId = body.tran_id ?? "";
  const s = (body.status ?? "").toUpperCase();
  if (s === "VALID" || s === "VALIDATED") return settleSuccess(deps, tranId, body.val_id);
  if (s === "FAILED" || s === "EXPIRED" || s === "UNATTEMPTED") return settleFailure(deps, tranId, "failed");
  if (s === "CANCELLED") return settleFailure(deps, tranId, "cancelled");
  return { status: "unknown", message: "Ignored." };
}
