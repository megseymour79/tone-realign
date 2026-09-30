/**
 * Public-site navigation, shared by the header, mobile menu, and footer.
 * Every path here must be registered in main.tsx — site-nav.test.ts guards
 * the list so a new link without a route can't ship silently.
 */

export interface NavItem {
  to: string;
  label: string;
  /** Accent dot shown in the mobile menu. */
  dot: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/how", label: "How it works", dot: "bg-sun" },
  { to: "/tone-check", label: "Tone check", dot: "bg-coral" },
  { to: "/drills", label: "Drills", dot: "bg-mint" },
  { to: "/watch", label: "Watch", dot: "bg-coral" },
  { to: "/library", label: "Library", dot: "bg-paper" },
];

/** The public routes the router must register for the nav to be safe. */
export const PUBLIC_ROUTES = ["/", ...NAV_ITEMS.map((n) => n.to)];

/**
 * The guided tour: the natural reading order through the public site.
 * Each section page gets a back/forward pager so visitors can walk the
 * whole story — Home → How → Tone check → Drills → Watch → Library —
 * without hunting for the nav. `/` opens the tour; Library closes it.
 */
export const PAGE_ORDER: { to: string; label: string; blurb: string; dot: string }[] = [
  { to: "/", label: "Home", blurb: "What ShiftedTone is", dot: "bg-coral" },
  { to: "/how", label: "How it works", blurb: "The three-step method", dot: "bg-sun" },
  { to: "/tone-check", label: "Tone check", blurb: "Find your default under pressure", dot: "bg-coral" },
  { to: "/drills", label: "Drills", blurb: "Pick a drill, train the tone", dot: "bg-mint" },
  { to: "/watch", label: "Watch", blurb: "Videos from the pros", dot: "bg-coral" },
  { to: "/library", label: "Library", blurb: "Research shelf + all videos", dot: "bg-paper" },
];

/** Prev/next stops of the tour for a given path (nulls at the ends). */
export function tourStops(
  pathname: string,
): { prev: (typeof PAGE_ORDER)[number] | null; next: (typeof PAGE_ORDER)[number] | null } {
  const i = PAGE_ORDER.findIndex((p) => p.to === pathname);
  return {
    prev: i > 0 ? PAGE_ORDER[i - 1] : null,
    next: i >= 0 && i < PAGE_ORDER.length - 1 ? PAGE_ORDER[i + 1] : null,
  };
}

/**
 * The signed-in app's walking order. Same idea as the public tour: every
 * page ends with back / next so the tools chain into one circuit —
 * dashboard → gym → calm → translate → quiz → reframe → progress →
 * back home. `/practice/:drillId` matches its position by prefix.
 */
export const APP_ORDER: { to: string; label: string; blurb: string }[] = [
  { to: "/dashboard", label: "Dashboard", blurb: "Your day at a glance" },
  { to: "/gym", label: "Gym", blurb: "Pick a drill, do the take" },
  { to: "/calm", label: "Calm", blurb: "Ground, then speak" },
  { to: "/translate", label: "Translate", blurb: "Say it again, mean it" },
  { to: "/quiz", label: "Read the Room", blurb: "Train the judgment" },
  { to: "/reframe", label: "Reframe Lab", blurb: "Rewrite the reaction" },
  { to: "/progress", label: "Progress", blurb: "Trends, trophies, history" },
];

/**
 * Route prefixes with a virtual position: `/practice/:drillId` sits
 * between Dashboard (0) and Translate (1), so its back/next resolve
 * without being a stable route in APP_ORDER.
 */
const APP_VIRTUAL: { prefix: string; prev: number; next: number }[] = [
  { prefix: "/practice/", prev: 0, next: 1 },
];

/**
 * Prev/next stops of the app circuit for a given path. The circuit
 * wraps — the last page's "next" is the dashboard — so every signed-in
 * page shows both buttons and the loop never dead-ends.
 */
export function appTourStops(
  pathname: string,
): { prev: (typeof APP_ORDER)[number] | null; next: (typeof APP_ORDER)[number] | null } {
  const len = APP_ORDER.length;
  const i = APP_ORDER.findIndex((p) => p.to === pathname);
  if (i < 0) {
    const match = APP_VIRTUAL.find((m) => pathname.startsWith(m.prefix));
    if (match) return { prev: APP_ORDER[match.prev], next: APP_ORDER[match.next] };
    return { prev: null, next: null };
  }
  return {
    prev: APP_ORDER[(i - 1 + len) % len],
    next: APP_ORDER[(i + 1) % len],
  };
}
