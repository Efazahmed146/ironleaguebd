import type { Metadata } from "next";
import { RequirePro } from "@/components/account/RequirePro";
import { RequireProfile } from "@/components/account/RequireProfile";
import { RegisterForm } from "@/components/compete/RegisterForm";

export const metadata: Metadata = { title: "Choose your category" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow mb-2">Step 1</p>
      <h1 className="mb-8 break-words font-display text-4xl font-black uppercase leading-none min-[400px]:text-5xl sm:text-6xl">
        Choose your <span className="text-volt-400">category</span>
      </h1>
      <RequirePro feature="enter a competition">
        <RequireProfile reason="Create your profile first so we can suggest your weight class.">
          <RegisterForm />

        </RequireProfile>
      </RequirePro>
    </div>
  );
}
