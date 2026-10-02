import { APP_ORDER, PAGE_ORDER } from "@/lib/site-nav";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.svg";
import {
  ChevronDown,
  Clapperboard,
  Dumbbell,
  Languages,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Shuffle,
  TrendingUp,
  Wind,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  id: "dashboard" | "gym" | "calm" | "translate" | "quiz" | "reframe" | "progress";
  to: string;
  label: string;
  short: string;
  icon: typeof Dumbbell;
  tab?: boolean;
}

const NAV: NavItem[] = [
  { id: "dashboard", to: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard, tab: true },
  { id: "gym", to: "/gym", label: "Gym", short: "Gym", icon: Dumbbell, tab: true },
  { id: "calm", to: "/calm", label: "Calm", short: "Calm", icon: Wind },
  { id: "translate", to: "/translate", label: "Translate", short: "Translate", icon: Languages, tab: true },
  { id: "quiz", to: "/quiz", label: "Read the Room", short: "Room", icon: MessagesSquare },
  { id: "reframe", to: "/reframe", label: "Reframe Lab", short: "Reframe", icon: Shuffle },
  { id: "progress", to: "/progress", label: "Progress", short: "Progress", icon: TrendingUp, tab: true },
];

export function AppShell({
  active,
  children,
}: {
  active?: NavItem["id"];
  children: ReactNode;
}) {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="nb-dots flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" title="Back to the ShiftedTone home page" className="group flex items-center gap-3">
            <img src={logo} alt="ShiftedTone" width={34} height={34} className="nb size-8 bg-ink transition-transform duration-200 group-hover:-rotate-6" />
            <span className="font-display text-lg leading-none">Shifted<span className="text-sun">Tone</span></span>
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
                    isActive ? "bg-sun text-white" : "bg-transparent text-paper/75 hover:text-paper",
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
            <button onClick={handleSignOut} className="nb nb-press flex items-center gap-2 bg-coral px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white">
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main id="app-main" className="flex-1 pb-16 md:pb-0">{children}</main>

      {/* Simplified mobile bottom nav: 4 tabs only, no mic button */}
      <nav aria-label="Primary (mobile)" className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-paper md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 items-end gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
          {NAV.filter((n) => n.tab).map((item) => (
            <TabItem key={item.id} item={item} active={active} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function EverythingMenu() {
  const { pathname } = useLocation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="nb nb-press flex items-center gap-1.5 bg-paper px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink" aria-label="All pages menu">
          Pages <ChevronDown className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-64 rounded-none border-2 border-ink bg-card p-0 nb-shadow-sm">
        <div className="grid grid-cols-2">
          <div>
            <DropdownMenuLabel className="border-b-2 border-ink px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-ink/60">Training</DropdownMenuLabel>
            <div className="flex flex-col p-1">
              {APP_ORDER.map((item) => {
                const Icon = NAV.find((n) => n.to === item.to)?.icon;
                const isCurrent = pathname === item.to;
                return (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link to={item.to} aria-current={isCurrent ? "page" : undefined} className={cn("cursor-pointer justify-start gap-2 rounded-none px-3 py-1.5 text-xs font-bold uppercase tracking-wide focus:bg-sun focus:text-white", isCurrent ? "bg-sun text-white" : "text-ink")}>
                      {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}{item.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </div>
          <div>
            <DropdownMenuLabel className="border-b-2 border-l-2 border-ink px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-ink/60">Learn</DropdownMenuLabel>
            <div className="flex flex-col p-1">
              {PAGE_ORDER.map((item) => (
                <DropdownMenuItem asChild key={item.to}>
                  <Link to={item.to} className="cursor-pointer justify-start rounded-none px-3 py-1.5 text-xs font-bold uppercase tracking-wide">
                    {item.to === "/watch" && <Clapperboard className="size-3.5" aria-hidden />}{item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TabItem({ item, active }: { item: NavItem; active?: NavItem["id"] }) {
  const Icon = item.icon;
  const isActive = active === item.id;
  return (
    <Link to={item.to} aria-current={isActive ? "page" : undefined} className={cn("flex flex-col items-center justify-center gap-0.5 py-1.5 text-[9px] font-bold uppercase tracking-widest", isActive ? "text-sun" : "text-muted-foreground")}>
      <Icon className={cn("size-5", isActive && "text-sun")} />
      {item.short}
    </Link>
  );
}

export function LevelRing({ level, pct }: { level: number; pct: number }) {
  const R = 15.5;
  const C = 2 * Math.PI * R;
  return (
    <span className="relative inline-flex size-9 items-center justify-center">
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r={R} fill="none" strokeWidth="3" className="stroke-paper/20" />
        <circle cx="18" cy="18" r={R} fill="none" strokeWidth="3" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} strokeLinecap="butt" className="stroke-sun" />
      </svg>
      <span className="font-display text-[11px] font-bold tabular-nums">{level}</span>
    </span>
  );
}
