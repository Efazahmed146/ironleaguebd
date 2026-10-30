import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-iron-800/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-iron-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          <span className="font-display font-bold uppercase tracking-wider text-iron-300">
            IronLeague BD
          </span>{" "}
          — built by lifters, for lifters.
        </p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>Scores use DOTS. Verified = weigh-in and fee approved.</span>
          <Link href="/rules" className="hover:text-volt-400">Rules</Link>
          <Link href="/admin" className="hover:text-volt-400">Moderators</Link>
        </p>
      </div>
    </footer>
  );
}
