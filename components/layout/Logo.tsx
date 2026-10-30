import Link from "next/link";
import { Dumbbell } from "lucide-react";

export function Logo() {
  return (
    <Link
      href="/"
      aria-label="IronLeague BD — home"
      className="group flex min-w-0 shrink items-center gap-2 sm:gap-2.5"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg sm:h-9 sm:w-9 bg-volt-400 text-iron-950 transition group-hover:shadow-glow-volt">
        <Dumbbell className="h-5 w-5 -rotate-45" strokeWidth={2.75} />
      </span>
      <span className="whitespace-nowrap font-display text-xl font-black uppercase leading-none tracking-wide sm:text-2xl">
        Iron<span className="text-volt-400">League</span>
        <span className="ml-1.5 -skew-x-12 inline-block rounded-sm bg-blood-500 px-1.5 py-0.5 align-middle text-xs font-extrabold tracking-widest text-white">
          BD
        </span>
      </span>
    </Link>
  );
}
