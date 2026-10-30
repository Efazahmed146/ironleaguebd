import type { Metadata } from "next";
import { RequirePro } from "@/components/account/RequirePro";
import { RequireProfile } from "@/components/account/RequireProfile";
import { AttemptsBoard } from "@/components/compete/AttemptsBoard";

export const metadata: Metadata = { title: "Attempts" };

export default function AttemptsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow mb-2">Step 4</p>
      <h1 className="mb-8 break-words font-display text-4xl font-black uppercase leading-none min-[400px]:text-5xl sm:text-6xl">
        Your <span className="text-volt-400">attempts</span>
      </h1>
      <RequirePro feature="record and submit attempts">
        <RequireProfile reason="Create your profile first.">
          <AttemptsBoard />

        </RequireProfile>
      </RequirePro>
    </div>
  );
}
