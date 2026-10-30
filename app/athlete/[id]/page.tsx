import type { Metadata } from "next";
import { AthleteProfile } from "@/components/athlete/AthleteProfile";
import { getLifters } from "@/lib/data";

export const metadata: Metadata = { title: "Lifter profile" };

export default async function AthletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lifters = await getLifters();
  const demo = lifters.find((l) => l.id === id) ?? null;
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <AthleteProfile id={id} demo={demo} />
    </div>
  );
}
