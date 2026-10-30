import type { Metadata } from "next";
import { SubscribeForm } from "@/components/subscription/SubscribeForm";

export const metadata: Metadata = { title: "Subscribe" };

export default function SubscribePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow mb-2">Pro membership</p>
      <h1 className="mb-8 break-words font-display text-4xl font-black uppercase leading-none min-[400px]:text-5xl sm:text-6xl">
        Subscribe &amp; <span className="text-volt-400">compete</span>
      </h1>
      <SubscribeForm />
    </div>
  );
}
