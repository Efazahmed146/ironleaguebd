import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const metadata: Metadata = { title: "Moderator panel", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow mb-2">Judges &amp; moderators</p>
      <h1 className="mb-8 break-words font-display text-4xl font-black uppercase leading-none min-[400px]:text-5xl sm:text-6xl">
        Review <span className="text-volt-400">queue</span>
      </h1>
      <AdminPanel />
    </div>
  );
}
