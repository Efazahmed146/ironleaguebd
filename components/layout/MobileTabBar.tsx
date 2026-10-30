import Link from "next/link";
import { NAV_ITEMS } from "./nav-items";
import { UnreadBadge } from "@/components/athlete/UnreadBadge";

const MOBILE_ITEMS = NAV_ITEMS.filter((i) => !i.desktopOnly);

/** App-style bottom navigation — the main nav on phones (most BD traffic). */
export function MobileTabBar() {
  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-iron-800 bg-iron-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {MOBILE_ITEMS.map(({ label, short, href, icon: Icon }) => {
          const inner = (
            <>
              <span className="relative">
                <Icon className="h-5 w-5" strokeWidth={2.25} />
                {label === "Messages" && <UnreadBadge />}
              </span>
              <span className="max-w-full truncate font-display text-[10px] font-bold uppercase tracking-wide min-[360px]:text-[11px] min-[360px]:tracking-wider">
                {short ?? label}
              </span>
            </>
          );
          return (
            <li key={label} className="min-w-0">
              <Link
                href={href}
                className="flex flex-col items-center gap-1 px-0.5 py-2.5 text-iron-300 transition hover:text-volt-400"
              >
                {inner}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
