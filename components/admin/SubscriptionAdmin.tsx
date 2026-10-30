"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

interface Row {
  id: string;
  user_id: string;
  plan: string;
  method: string;
  sender_number: string;
  trx_id: string;
  amount_bdt: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  name?: string;
}

/** Approve or reject subscription payments. Only role = 'admin' can (enforced in the database). */
export function SubscriptionAdmin() {
  const { ready, isAdmin } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    const q = sb.from("subscription_requests").select("*").order("created_at", { ascending: false }).limit(100);
    const { data, error } = await (filter === "pending" ? q.eq("status", "pending") : q);
    if (error) return setErr(error.message);
    const list = (data as Row[]) ?? [];
    const ids = [...new Set(list.map((r) => r.user_id))];
    const { data: ps } = ids.length ? await sb.from("users").select("id,name").in("id", ids) : { data: [] };
    const names = new Map((ps as { id: string; name: string }[] | null)?.map((p): [string, string] => [p.id, p.name]));
    setRows(list.map((r) => ({ ...r, name: names.get(r.user_id) })));
  }, [filter]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  async function approve(id: string) {
    setErr("");
    const { error } = await supabase().rpc("approve_subscription", { request_id: id });
    if (error) return setErr(error.message);
    await load();
  }
  async function reject(id: string) {
    const reason = window.prompt("Reason for rejecting (shown to the user):") ?? "";
    setErr("");
    const { error } = await supabase().rpc("reject_subscription", { request_id: id, reason: reason || null });
    if (error) return setErr(error.message);
    await load();
  }

  if (!ready) return <div className="panel h-48 animate-pulse-glow" aria-hidden />;
  if (!isAdmin) {
    return (
      <div className="panel flex flex-col items-center gap-3 p-10 text-center">
        <ShieldAlert className="h-9 w-9 text-blood-400" />
        <p className="font-display text-2xl font-black uppercase">Admins only</p>
        <p className="max-w-sm text-sm text-iron-400">
          Your account isn&apos;t an admin. Set <code>role = &apos;admin&apos;</code> on your profile in Supabase (see the end of
          supabase/setup.sql).
        </p>
        <Link href="/" className="btn-ghost">Home</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["pending", "all"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`chip ${filter === f ? "bg-volt-400 text-iron-950 ring-volt-400" : "bg-iron-900 text-iron-300 ring-iron-700"}`}>
            {f === "pending" ? "Pending" : "All"}
          </button>
        ))}
      </div>
      {err && <p role="alert" className="text-sm text-blood-400">{err}</p>}
      {rows.length === 0 && <p className="text-sm text-iron-500">Nothing here.</p>}
      {rows.map((r) => (
        <div key={r.id} className="panel space-y-2 p-4">
          <p className="font-semibold text-iron-50">
            {r.name || r.user_id.slice(0, 8)} · ৳{r.amount_bdt} · {r.plan} · {r.method === "bkash" ? "bKash" : "Nagad"}
          </p>
          <p className="text-sm text-iron-300">
            From <b>{r.sender_number}</b> · TrxID <b className="text-volt-300">{r.trx_id}</b> ·{" "}
            {new Date(r.created_at).toLocaleString("en-GB")}
          </p>
          <p className="text-xs text-iron-500">Match the TrxID, amount and sender number in your {r.method === "bkash" ? "bKash" : "Nagad"} statement before approving.</p>
          {r.status === "pending" ? (
            <div className="flex gap-2">
              <button type="button" className="btn-volt !py-2 text-sm" onClick={() => approve(r.id)}>
                <CheckCircle2 className="h-4 w-4" /> Approve
              </button>
              <button type="button" className="btn-ghost !py-2 text-sm !text-blood-400" onClick={() => reject(r.id)}>
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </div>
          ) : (
            <span className={`chip ${r.status === "approved" ? "bg-volt-400 text-iron-950 ring-volt-400" : "bg-blood-500 text-white ring-blood-500"}`}>{r.status}</span>
          )}
        </div>
      ))}
    </div>
  );
}
