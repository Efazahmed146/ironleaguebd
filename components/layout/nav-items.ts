import { BookOpen, Home, Medal, MessageCircle, Share2, Trophy, User } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
  /** Hide from the 5-slot mobile tab bar (still in the desktop header). */
  desktopOnly?: boolean;
  /** Shorter text for the phone tab bar. */
  short?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Leaderboard", short: "Board", href: "/#leaderboard", icon: Trophy },
  { label: "Compete", href: "/compete", icon: Medal },
  { label: "Rules", href: "/rules", icon: BookOpen, desktopOnly: true },
  { label: "Flex Card", href: "/flex", icon: Share2 },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "Profile", href: "/join", icon: User, desktopOnly: true },
];
