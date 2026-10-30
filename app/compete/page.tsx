import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { UpgradeBanner } from "@/components/account/UpgradeBanner";
import { RequireProfile } from "@/components/account/RequireProfile";
import { CompeteHub } from "@/components/compete/CompeteHub";
import { MEET, feeRequired } from "@/lib/meet";

export const metadata: Metadata = { title: "Compete" };

export default function CompetePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow mb-2">{MEET.name}</p>
      <h1 className="break-words font-display text-4xl font-black uppercase leading-none min-[400px]:text-5xl sm:text-6xl">
        Your <span className="text-volt-400">meet</span>
      </h1>
      <p className="mb-6 mt-3 max-w-xl text-iron-300">
        Compete from your own gym, anywhere in Bangladesh. Five steps from category to your Flex Card.{" "}
        {feeRequired() ? `Entry fee ৳${MEET.entryFeeBdt}.` : "Free entry."}
      </p>
      <Link href="/rules" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-volt-400 hover:text-volt-300">
        <BookOpen className="h-4 w-4" /> Read the rules & lift standards first
      </Link>
      <UpgradeBanner />
      <RequireProfile reason="Create your profile (name, age, gender, district and bodyweight) to enter.">
        <CompeteHub />
      </RequireProfile>
    </div>
  );
}
