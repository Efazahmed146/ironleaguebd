import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentRow, PaymentStore, PayStatus } from "./settle";

/** Supabase-backed PaymentStore using the service-role client. Server only. */
export function supabasePaymentStore(): PaymentStore | null {
  const admin = createAdminClient();
  if (!admin) return null;
  return {
    async get(tranId) {
      const { data } = await admin
        .from("entry_payments")
        .select("tran_id, user_id, meet_id, amount_bdt, status")
        .eq("tran_id", tranId)
        .maybeSingle();
      return (data as PaymentRow | null) ?? null;
    },
    async update(tranId, patch, onlyIf: PayStatus[]) {
      const { data, error } = await admin
        .from("entry_payments")
        .update(patch)
        .eq("tran_id", tranId)
        .in("status", onlyIf)
        .select("tran_id");
      if (error) return { changed: false, conflict: error.code === "23505" };
      return { changed: (data?.length ?? 0) > 0 };
    },
  };
}
