import type { Metadata } from "next";
import { Network } from "@/components/athlete/Network";
import { getLifters } from "@/lib/data";
import type { Person } from "@/lib/social";

export const metadata: Metadata = { title: "Followers & following" };

export default async function NetworkPage() {
  const demo: Person[] = (await getLifters()).map((l) => ({
    id: l.id,
    name: l.name,
    homeGym: l.homeGym,
    district: l.district,
    cloud: false,
  }));
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow mb-2">Your people</p>
      <h1 className="mb-8 break-words font-display text-4xl font-black uppercase leading-none min-[400px]:text-5xl sm:text-6xl">
        Follow<span className="text-volt-400">ing</span>
      </h1>
      <Network demo={demo} />
    </div>
  );
}
