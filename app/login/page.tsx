import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-14">
      <p className="eyebrow mb-2">Welcome back</p>
      <h1 className="mb-8 break-words font-display text-4xl font-black uppercase leading-none min-[400px]:text-5xl sm:text-6xl">
        Enter the <span className="text-volt-400">league</span>
      </h1>
      <Suspense fallback={<div className="panel h-96 animate-pulse-glow" aria-hidden />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
