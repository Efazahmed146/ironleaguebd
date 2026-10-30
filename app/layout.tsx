import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { AuthProvider } from "@/lib/auth";
import { THEME_INIT_SCRIPT } from "@/lib/theme-init";
import { CloudSync } from "@/components/account/CloudSync";
import { NavProgress } from "@/components/layout/NavProgress";
import { ProfileGate } from "@/components/account/ProfileGate";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "IronLeague BD — Bangladesh's Lifting League",
    template: "%s · IronLeague BD",
  },
  description:
    "Log your squat, bench and deadlift PRs, climb the pound-for-pound leaderboard, and flex your numbers. The Strava for Bangladeshi gym bros.",
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
  openGraph: {
    title: "IronLeague BD",
    description: "Lift heavy. Rank fair. Flex hard.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0e",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${display.variable} ${sans.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        {/* Ambient background: grid + lime/crimson glow */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-hero-glow"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-grid-iron bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]"
        />

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-volt-400 focus:px-3 focus:py-2 focus:font-bold focus:text-iron-950"
        >
          Skip to content
        </a>

        <AuthProvider>
          <CloudSync />
          <ProfileGate />
          <NavProgress />
          <SiteHeader />
          <main id="main" className="pb-28 lg:pb-16">
            {children}
          </main>
          <SiteFooter />
          <MobileTabBar />
        </AuthProvider>
      </body>
    </html>
  );
}
