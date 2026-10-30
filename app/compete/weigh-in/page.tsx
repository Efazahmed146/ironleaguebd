import type { Metadata } from "next";
import { RequirePro } from "@/components/account/RequirePro";
import { RequireProfile } from "@/components/account/RequireProfile";
import { WeighInForm } from "@/components/compete/WeighInForm";

export const metadata: Metadata = { title: "Weigh-in" };

export default function WeighInPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow mb-2">Step 2</p>
      <h1 className="mb-8 break-words font-display text-4xl font-black uppercase leading-none min-[400px]:text-5xl sm:text-6xl">
        Weigh-<span className="text-volt-400">in</span>
      </h1>
      <RequirePro feature="weigh in for the meet">
        <RequireProfile reason="Create your profile first.">
          <WeighInForm />

        </RequireProfile>
      </RequirePro>
    </div>
  );
}
