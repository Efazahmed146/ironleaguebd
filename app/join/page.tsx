import type { Metadata } from "next";
import { ProfileShortcuts } from "@/components/athlete/Network";
import { JoinForm } from "@/components/join/JoinForm";

export const metadata: Metadata = { title: "Join the League" };

export default function JoinPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow mb-2">Your profile</p>
      <h1 className="mb-8 break-words font-display text-4xl font-black uppercase leading-none min-[400px]:text-5xl sm:text-6xl">
        Join the <span className="text-volt-400">league</span>
      </h1>
      <ProfileShortcuts />
      <JoinForm />
    </div>
  );
}
