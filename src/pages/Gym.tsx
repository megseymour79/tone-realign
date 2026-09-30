import { NBButton, NBPanel } from "@/components/nb";
import { AppShell } from "@/components/AppShell";
import { DRILLS } from "@/lib/drills";
import { getAccessibleDailyChallenge } from "@/lib/daily";
import { levelInfo } from "@/lib/gamify";
import {
  UNLOCKABLE_DRILLS,
  isUnlocked,
  unlockGoalLine,
  unlockProgressPct,
  type UnlockStats,
} from "@/lib/unlocks";
import { api } from "@/convex/_generated/api";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MessagesSquare,
  Mic,
  Sparkles,
  Timer,
  Lock,
} from "lucide-react";
import { useQuery } from "convex/react";
import { Link, useSearchParams } from "react-router";

/**
 * /gym — the training floor. One job: pick a drill and do it. The daily
 * challenge headlines, the whole catalog sits below with honest unlock
 * gates, and the no-mic practices live one callout away.
 */
export default function Gym() {
  const [searchParams, setSearchParams] = useSearchParams();
  const progression = useQuery(api.dailyLog.progression);
  const drillStats = useQuery(api.sessions.drillStats);
  // Unlocks and bests are computed from live stats; rendering before
  // progression resolves would flash every earned drill as locked.
  if (progression === undefined) {
    return (
      <AppShell active="gym">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <NBPanel className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Loading your gym…</p>
          </NBPanel>
        </div>
      </AppShell>
    );
  }
  const bestByDrill = new Map((drillStats ?? []).map((s) => [s.drill, s]));
  const level = levelInfo(progression?.totalXp ?? 0);

  const unlockStats: UnlockStats = {
    takes: progression?.totalSessions ?? 0,
    level: level.level,
    drillsTried: progression?.drillsTried ?? 0,
    bestScore: progression?.bestOverall ?? 0,
    streak: progression?.streakDays ?? 0,
  };
  const daily = getAccessibleDailyChallenge((drillId) => {
    const gate = UNLOCKABLE_DRILLS.find((u) => u.id === drillId);
    return !gate || isUnlocked(gate, unlockStats);
  });
  const perPage = 4;
  const totalPages = Math.max(1, Math.ceil(DRILLS.length / perPage));
  const rawPage = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(rawPage)
    ? Math.min(totalPages, Math.max(1, Math.floor(rawPage)))
    : 1;
  const visibleDrills = DRILLS.slice((page - 1) * perPage, page * perPage);
  const setPage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    setSearchParams(next);
  };

  return (
    <AppShell active="gym">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        {/* Daily challenge */}
        <section className="nb relative overflow-hidden bg-sun nb-shadow">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-4">
              <span className="nb flex size-12 shrink-0 items-center justify-center bg-card">
                <Sparkles className="size-6" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest">
                  Today's challenge
                </p>
                <h1 className="font-display text-xl leading-tight sm:text-2xl">
                  {daily.drill.name} — {daily.angle.toLowerCase()}
                </h1>
              </div>
            </div>
            <Link to={`/practice/${daily.drill.id}`}>
              <NBButton variant="ink" className="text-xs">
                <Mic className="size-3.5" /> Do today's take
              </NBButton>
            </Link>
          </div>
        </section>

        {/* The gym — every drill, honest locks */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">
              The <span className="italic text-coral">gym</span>
            </h2>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Page {page} of {totalPages}</p>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {visibleDrills.map((drill) => {
              const s = bestByDrill.get(drill.id);
              const gate = UNLOCKABLE_DRILLS.find((u) => u.id === drill.id);
              const open = !gate || isUnlocked(gate, unlockStats);
              return (
                <NBPanel key={drill.id} className={open ? "flex flex-col" : "flex flex-col bg-card/60"}>
                  <div className={`border-b-2 border-ink px-5 py-3 ${drill.color} ${open ? "" : "opacity-60"}`}>
                    <div className="flex items-center justify-between font-display text-lg leading-tight">
                      {drill.name}
                      {!open && <Lock className="size-4" />}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-widest">
                      {drill.tag}
                    </div>
                  </div>
                  {open ? (
                    <>
                      <p className="flex-1 p-5 text-sm leading-relaxed text-muted-foreground">
                        {drill.focus}
                      </p>
                      <div className="flex items-center justify-between border-t-2 border-ink px-5 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Timer className="size-3.5" /> {drill.seconds}s
                        </span>
                        <span>{s ? `Best score ${s.bestScore}` : "First try"}</span>
                      </div>
                      <Link to={`/practice/${drill.id}`} className="border-t-2 border-ink">
                        <NBButton variant="paper" className="w-full rounded-none py-2.5 text-xs">
                          Start drill <ArrowRight className="size-3.5" />
                        </NBButton>
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="flex-1 p-5 text-sm leading-relaxed text-muted-foreground">
                        {gate!.blurb}
                      </p>
                      <div className="border-t-2 border-ink px-5 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Unlocks with
                        </p>
                        <p className="mt-0.5 text-sm font-bold">{unlockGoalLine(gate!, unlockStats)}</p>
                      </div>
                      <div className="h-1.5 border-t-2 border-ink bg-muted">
                        <div
                          className="h-full bg-sun"
                          style={{ width: `${unlockProgressPct(gate!, unlockStats)}%` }}
                        />
                      </div>
                    </>
                  )}
                </NBPanel>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <NBButton variant="paper" className="px-3 py-2 text-xs" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                <ChevronLeft className="size-3.5" /> Previous
              </NBButton>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Showing drills {(page - 1) * perPage + 1}-{Math.min(page * perPage, DRILLS.length)} of {DRILLS.length}
              </p>
              <NBButton variant="paper" className="px-3 py-2 text-xs" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                Next <ChevronRight className="size-3.5" />
              </NBButton>
            </div>
          )}
        </section>

        {/* No-mic callout */}
        <section className="nb bg-ink text-paper">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-4">
              <span className="nb flex size-11 shrink-0 items-center justify-center bg-card">
                <MessagesSquare className="size-5 text-sun" />
              </span>
              <div>
                <h2 className="font-display text-lg leading-tight">No mic handy?</h2>
                <p className="text-sm text-paper/70">
                  Read the Room trains the same judgment without recording.
                </p>
              </div>
            </div>
            <Link to="/quiz">
              <NBButton variant="sun" className="text-xs">
                Today's scenario <ArrowRight className="size-3.5" />
              </NBButton>
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
