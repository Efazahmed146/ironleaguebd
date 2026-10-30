import type { Metadata } from "next";
import { RequirePro } from "@/components/account/RequirePro";
import { RequireProfile } from "@/components/account/RequireProfile";
import { PaymentForm } from "@/components/compete/PaymentForm";

export const metadata: Metadata = { title: "Entry fee" };

export default function PaymentPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow mb-2">Step 3</p>
      <h1 className="mb-8 break-words font-display text-4xl font-black uppercase leading-none min-[400px]:text-5xl sm:text-6xl">
        Entry <span className="text-volt-400">fee</span>
      </h1>
      <RequirePro feature="pay your meet entry fee">
        <RequireProfile reason="Create your profile first.">
          <PaymentForm />

        </RequireProfile>
      </RequirePro>
    </div>
  );
}
