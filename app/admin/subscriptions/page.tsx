import type { Metadata } from "next";
import { SubscriptionAdmin } from "@/components/admin/SubscriptionAdmin";

export const metadata: Metadata = { title: "Subscription payments" };

export default function SubscriptionAdminPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow mb-2">Admin</p>
      <h1 className="mb-8 break-words font-display text-4xl font-black uppercase leading-none min-[400px]:text-5xl sm:text-6xl">
        Subscription <span className="text-volt-400">payments</span>
      </h1>
      <SubscriptionAdmin />
    </div>
  );
}
