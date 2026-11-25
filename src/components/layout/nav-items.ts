import { ChartNoAxesColumnIncreasing, Dumbbell, Flame, House, UserRound, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Préfixes de chemin considérés comme actifs pour cet onglet. */
  match: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: House, match: ["/"] },
  { href: "/workouts", label: "Workouts", icon: Dumbbell, match: ["/workouts", "/exercises", "/session"] },
  { href: "/progress", label: "Progress", icon: ChartNoAxesColumnIncreasing, match: ["/progress"] },
  { href: "/nutrition", label: "Nutrition", icon: Flame, match: ["/nutrition"] },
  { href: "/profile", label: "Profile", icon: UserRound, match: ["/profile"] },
];

export function isActive(item: NavItem, pathname: string): boolean {
  return item.match.some((m) => (m === "/" ? pathname === "/" : pathname === m || pathname.startsWith(`${m}/`)));
}

export function currentSection(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => isActive(item, pathname));
}
