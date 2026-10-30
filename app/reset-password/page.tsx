import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-14">
      <p className="eyebrow mb-2">Account</p>
      <h1 className="mb-8 break-words font-display text-4xl font-black uppercase leading-none min-[400px]:text-5xl sm:text-6xl">
        New <span className="text-volt-400">password</span>
      </h1>
      <ResetPasswordForm />
    </div>
  );
}
