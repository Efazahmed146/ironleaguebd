import Link from "next/link";
import { Logo } from "./Logo";
import { NAV_ITEMS } from "./nav-items";
import { AccountButton } from "@/components/account/AccountButton";
import { ThemeToggle } from "./ThemeToggle";
import { UnreadBadge } from "@/components/athlete/UnreadBadge";

export function SiteHeader() {
  // Home + Profile live in the mobile tab bar; desktop shows the primary links.
  const links = NAV_ITEMS.filter((i) => i.label !== "Home" && i.label !== "Profile");

  return (
    <header className="sticky top-0 z-40 border-b border-iron-800/80 bg-iron-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {links.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="relative rounded-md px-3 py-2 font-display text-sm font-bold uppercase tracking-wider text-iron-300 transition hover:bg-iron-900 hover:text-volt-400"
            >
              {label}
              {label === "Messages" && <UnreadBadge />}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <AccountButton />
        </div>
      </div>
    </header>
  );
}
