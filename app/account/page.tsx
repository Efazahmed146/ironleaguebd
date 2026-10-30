import type { Metadata } from "next";
import { AccountSettings } from "@/components/account/AccountSettings";

export const metadata: Metadata = { title: "Account settings" };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow mb-2">Account</p>
      <h1 className="mb-8 break-words font-display text-4xl font-black uppercase leading-none min-[400px]:text-5xl sm:text-6xl">
        Account <span className="text-volt-400">settings</span>
      </h1>
      <AccountSettings />
    </div>
  );
}
