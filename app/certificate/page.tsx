import type { Metadata } from "next";
import { getLifters } from "@/lib/data";
import { CertificateStudio } from "@/components/certificate/CertificateStudio";

export const metadata: Metadata = { title: "My certificate" };

export default async function CertificatePage() {
  const lifters = await getLifters();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow mb-2">Digital certificate</p>
      <h1 className="mb-8 font-display text-5xl font-black uppercase leading-none sm:text-6xl">
        My <span className="text-volt-400">certificate</span>
      </h1>
      <CertificateStudio lifters={lifters} />
    </div>
  );
}
