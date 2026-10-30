import type { Metadata } from "next";
import { Suspense } from "react";
import { ModeSelect } from "@/components/auth/ModeSelect";

export const metadata: Metadata = { title: "Welcome" };

export default function WelcomePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <Suspense fallback={<div className="panel h-96 animate-pulse-glow" aria-hidden />}>
        <ModeSelect />
      </Suspense>
    </div>
  );
}
