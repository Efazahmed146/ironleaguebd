import Link from "next/link";
import { ArrowDown, Flame } from "lucide-react";
import { getLifters } from "@/lib/data";
import { getDistricts } from "@/lib/leaderboard";
import { totalKg } from "@/lib/scoring";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";

export default async function HomePage() {
  const lifters = await getLifters();

  const stats = [
    { label: "Lifters", value: lifters.length.toLocaleString("en-US") },
    {
      label: "Kg moved (total PRs)",
      value: lifters.reduce((sum, l) => sum + totalKg(l), 0).toLocaleString("en-US"),
    },
    { label: "Districts", value: String(getDistricts(lifters).length) },
    {
      label: "Verified",
      value: `${Math.round((lifters.filter((l) => l.verified).length / lifters.length) * 100)}%`,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* Hero */}
      <section className="py-14 sm:py-20">
        <p className="eyebrow mb-4 flex items-center gap-2">
          <Flame className="h-4 w-4 animate-pulse-glow" />
          Bangladesh&apos;s lifting league · Season 01
        </p>

        <h1 className="font-display text-6xl font-black uppercase leading-[0.88] tracking-tight sm:text-8xl lg:text-9xl">
          Lift heavy.
          <br />
          <span className="text-volt-400">Rank fair.</span>
          <br />
          Flex hard.
        </h1>

        <p className="mt-6 max-w-xl text-lg text-iron-300">
          Log your squat, bench and deadlift. Get scored pound-for-pound so a 60 kg
          machine and a 120 kg monster fight on equal terms — then take your
          numbers to Instagram.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/join" className="btn-volt">
            Join the league
          </Link>
          <Link href="/compete" className="btn-ghost">
            Compete now
          </Link>
          <a href="#leaderboard" className="btn-ghost">
            See the board <ArrowDown className="h-5 w-5" />
          </a>
        </div>

        <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-iron-800 ring-1 ring-iron-800 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-iron-950/90 px-5 py-4">
              <dd className="font-display text-4xl font-black tabular-nums text-iron-50">
                {s.value}
              </dd>
              <dt className="mt-0.5 text-[11px] font-bold uppercase tracking-stencil text-iron-500">
                {s.label}
              </dt>
            </div>
          ))}
        </dl>
      </section>

      <Leaderboard lifters={lifters} />
    </div>
  );
}
