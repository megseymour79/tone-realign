import { levelInfo } from "@/lib/gamify";
import { APP_ORDER, PAGE_ORDER, appTourStops } from "@/lib/site-nav";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.svg";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Clapperboard,
  Dumbbell,
  LayoutDashboard,
  Languages,
  LogOut,
  MessagesSquare,
  Mic,
  Shuffle,
  TrendingUp,
  Wind,
} from "lucide-react";
import { useQuery } from "convex/react";
import { Link, useLocation, useNavigate } from "react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  id: "dashboard" | "gym" | "calm" | "translate" | "quiz" | "reframe" | "progress";
  to: string;
  label: string;
  short: string;
  icon: typeof Mic;
  /** Shown as one of the five mobile tab-bar slots (plus the mic FAB). */
  tab?: boolean;
}

/** The signed-in app's seven destinations, in nav order. */
const NAV: NavItem[] = [
  { id: "dashboard", to: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard, tab: true },
  { id: "gym", to: "/gym", label: "Gym", short: "Gym", icon: Dumbbell, tab: true },
  { id: "calm", to: "/calm", label: "Calm", short: "Calm", icon: Wind },
  { id: "translate", to: "/translate", label: "Translate", short: "Translate", icon: Languages, tab: true },
  { id: "quiz", to: "/quiz", label: "Read the Room", short: "Room", icon: MessagesSquare },
  { id: "reframe", to: "/reframe", label: "Reframe Lab", short: "Reframe", icon: Shuffle },
  { id: "progress", to: "/progress", label: "Progress", short: "Progress", icon: TrendingUp, tab: true },
];

/** The signed-in app's shared chrome: one header, consistent nav, live level. */
export function AppShell({
  active,
  children,
}: {
  active?: NavItem["id"];
  children: ReactNode;
}) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const tour = appTourStops(pathname);
  const progression = useQuery(api.dailyLog.progression);const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const level = levelInfo(progression?.totalXp ?? 0);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="nb-dots flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link
            to="/"
            title="Back to the ShiftedTone home page"
            className="group flex items-center gap-3"
          >
            <img
              src={logo}
              alt="ShiftedTone"
              width={34}
              height={34}
              className="nb size-8 bg-ink transition-transform duration-200 group-hover:-rotate-6"
            />
            <span className="font-display text-lg leading-none">
              Shifted<span className="text-sun">Tone</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "nb nb-press flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors",
                    isActive ? "bg-sun text-ink" : "bg-transparent text-paper/75 hover:text-paper",
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <EverythingMenu />
            <Link
              to="/dashboard#progress"
              className="flex items-center gap-2"
              title={`Level ${level.level} — ${level.label}`}
            >
              <LevelRing level={level.level} pct={level.progressPct} />
              <span className="hidden flex-col leading-tight lg:flex">
                <span className="text-[10px] font-bold uppercase tracking-widest text-paper/60">
                  Level {level.level}
                </span>
                <span className="font-display text-xs">{level.label}</span>
              </span>
            </Link>
            <button
              onClick={handleSignOut}
              className="nb nb-press flex items-center gap-2 bg-coral px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-ink"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main id="app-main" className="flex-1 pb-16 md:pb-0">        {children}
      </main>

      <AppPager tour={tour} />

      <footer className="hidden border-t-2 border-ink bg-ink py-4 text-center text-[10px] font-bold uppercase tracking-widest text-paper/50 md:block">
        ShiftedTone — train the tone that says it
      </footer>

      {/* Mobile bottom tab bar — thumb-reachable, with the mic as the hub */}
      <nav
        aria-label="Primary (mobile)"
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-paper md:hidden"
      >
        <div className="relative mx-auto grid max-w-md grid-cols-5 items-end px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
          {NAV.filter((n) => n.tab).slice(0, 2).map((item) => (
            <TabItem key={item.id} item={item} active={active} />
          ))}

          {/* Central mic FAB — jump to the gym floor */}
          <Link
            to="/gym"
            aria-label="Open the gym"
            title="Open the gym"
            className="flex flex-col items-center"
          >
            <span className="nb nb-press -mt-5 flex size-14 items-center justify-center bg-coral nb-shadow">
              <Mic className="size-6" />
            </span>
            <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Take
            </span>
          </Link>

          {NAV.filter((n) => n.tab).slice(2).map((item) => (
            <TabItem key={item.id} item={item} active={active} />
          ))}
        </div>
      </nav>
    </div>
  );
}

/**
 * The everything menu: every signed-in destination plus the whole public
 * site (Home, How it works, Tone check, Drills, Watch, Library). One tap
 * reaches any page — no dead ends between the app and the public site.
 */
function EverythingMenu() {
  const { pathname } = useLocation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="nb nb-press flex items-center gap-1.5 bg-paper px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink"
          aria-label="All pages menu"
        >
          Pages
          <ChevronDown className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-64 rounded-none border-2 border-ink bg-card p-0 nb-shadow-sm"
      >
        <div className="grid grid-cols-2">
          <div>
            <DropdownMenuLabel className="border-b-2 border-ink px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-ink/60">
              Training
            </DropdownMenuLabel>
            <div className="flex flex-col p-1">
              {APP_ORDER.map((item) => {
                const Icon = NAV.find((n) => n.to === item.to)?.icon;
                const isCurrent = pathname === item.to;
                return (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link
                      to={item.to}
                      aria-current={isCurrent ? "page" : undefined}
                      className={cn(
                        "cursor-pointer justify-start gap-2 rounded-none px-3 py-1.5 text-xs font-bold uppercase tracking-wide focus:bg-sun focus:text-ink",
                        isCurrent ? "bg-sun text-ink" : "text-ink",
                      )}
                    >
                      {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </div>
          <div>
            <DropdownMenuLabel className="border-b-2 border-l-2 border-ink px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-ink/60">
              Learn
            </DropdownMenuLabel>
            <div className="flex flex-col p-1">
              {PAGE_ORDER.map((item) => (
                <DropdownMenuItem asChild key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      "cursor-pointer justify-start rounded-none px-3 py-1.5 text-xs font-bold uppercase tracking-wide",
                      item.to === "/watch" && "gap-2",
                    )}
                  >
                    {item.to === "/watch" && (
                      <Clapperboard className="size-3.5" aria-hidden />
                    )}
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t-2 border-ink bg-sun px-3 py-2 text-[10px] font-bold uppercase tracking-widest">
          The whole site, one tap away
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Back/next pager at the bottom of every signed-in page — the app
 * circuit equivalent of the public site's PagePager. Known pages get
 * both buttons (the loop wraps); unknown routes render nothing.
 */
function AppPager({
  tour,
}: {
  tour: ReturnType<typeof appTourStops>;
}) {
  if (!tour.prev && !tour.next) return null;
  return (
    <nav
      aria-label="Next and previous"
      className="mx-auto flex w-full max-w-6xl items-stretch justify-between gap-4 px-4 pb-24 md:pb-6"
    >
      {tour.prev && (
        <Link to={tour.prev.to} className="group min-w-0 flex-1">
          <div className="nb nb-press flex h-full items-center gap-3 bg-card p-4">
            <ArrowLeft className="size-5 shrink-0 transition-transform group-hover:-translate-x-1" />
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Back — {tour.prev.blurb}
              </span>
              <span className="block truncate font-display text-lg leading-tight">
                {tour.prev.label}
              </span>
            </span>
          </div>
        </Link>
      )}
      {tour.next && (
        <Link to={tour.next.to} className="group min-w-0 flex-1">
          <div className="nb nb-press flex h-full items-center justify-end gap-3 bg-sun p-4 text-right">
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-ink/70">
                Next — {tour.next.blurb}
              </span>
              <span className="block truncate font-display text-lg leading-tight">
                {tour.next.label}
              </span>
            </span>
            <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      )}
    </nav>
  );
}

function TabItem({
  item,
  active,
}: {
  item: NavItem;
  active?: NavItem["id"];
}) {
  const Icon = item.icon;
  const isActive = active === item.id;
  return (
    <Link
      to={item.to}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-0.5 py-1 text-[9px] font-bold uppercase tracking-widest",
        isActive ? "text-ink" : "text-muted-foreground",
      )}
    >
      <Icon className={cn("size-5", isActive && "text-coral")} />
      {item.short}
    </Link>
  );
}

/** Small round XP progress ring with the level number inside. */
export function LevelRing({ level, pct }: { level: number; pct: number }) {
  const R = 15.5;
  const C = 2 * Math.PI * R;
  return (
    <span className="relative inline-flex size-9 items-center justify-center">
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r={R} fill="none" strokeWidth="3" className="stroke-paper/20" />
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          strokeWidth="3"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct / 100)}
          strokeLinecap="butt"
          className="stroke-sun"
        />
      </svg>
      <span className="font-display text-[11px] font-bold tabular-nums">{level}</span>
    </span>
  );
}
