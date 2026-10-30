import type { Metadata } from "next";
import { getLifters } from "@/lib/data";
import { FlexStudio } from "@/components/flex/FlexStudio";

export const metadata: Metadata = { title: "Flex Card" };

export default async function FlexPage() {
  const lifters = await getLifters();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow mb-2">Instagram-story ready</p>
      <h1 className="mb-8 break-words font-display text-4xl font-black uppercase leading-none min-[400px]:text-5xl sm:text-6xl">
        Flex <span className="text-volt-400">card</span>
      </h1>
      <FlexStudio lifters={lifters} />
    </div>
  );
}
