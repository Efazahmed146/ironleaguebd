import type { Metadata } from "next";
import { MessagesCenter } from "@/components/athlete/MessagesCenter";
import { getLifters } from "@/lib/data";
import type { Person } from "@/lib/social";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const demo: Person[] = (await getLifters()).map((l) => ({
    id: l.id,
    name: l.name,
    homeGym: l.homeGym,
    district: l.district,
    cloud: false,
  }));
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="eyebrow mb-2">Inbox</p>
      <h1 className="mb-6 break-words font-display text-4xl font-black uppercase leading-none min-[400px]:text-5xl sm:text-6xl">
        Mess<span className="text-volt-400">ages</span>
      </h1>
      <MessagesCenter demo={demo} />
    </div>
  );
}
