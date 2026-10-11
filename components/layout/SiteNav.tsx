"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GAMES } from "@/lib/games/registry";

const GAME_ROUTES = GAMES.filter((g) => g.status === "playable").map((g) => g.href);

const LINK = "relative rounded-md py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sun-400";
const ACTIVE = "text-sun-400 after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-sun-400";
const IDLE = "text-white/80 hover:text-white";

/** Main navigation. "Games" points at the hub's game grid and is active inside any game. */
export function SiteNav() {
  const pathname = usePathname();
  const items = [
    { label: "Home", href: "/", active: pathname === "/" },
    { label: "Games", href: "/#games", active: GAME_ROUTES.some((r) => pathname.startsWith(r)) },
  ];
  return (
    <nav aria-label="Main" className="text-[13px] font-semibold sm:text-sm">
      <ul className="flex items-center gap-3 sm:gap-7">
        {items.map((item) => (
          <li key={item.label}>
            <Link href={item.href} aria-current={item.active ? "page" : undefined} className={`${LINK} ${item.active ? ACTIVE : IDLE}`}>
              {item.label}
            </Link>
          </li>
        ))}
        {/* No Blog or Contact pages exist yet: shown, but not links. */}
        {["Blog", "Contact"].map((label) => (
          <li key={label}>
            <span aria-disabled="true" title="Coming soon" className="cursor-default py-1 text-white/45">
              {label}
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
