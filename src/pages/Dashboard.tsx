import { NBButton, NBPanel, NBStat } from "@/components/nb";
import { AppShell, LevelRing } from "@/components/AppShell";
import { DailyChecklist } from "@/components/DailyChecklist";
import { dailyLabel, getAccessibleDailyChallenge } from "@/lib/daily";
import { GROUNDING_EXERCISES } from "@/lib/grounding";
import { arcDaysLeft, arcStageFor } from "@/lib/arc";
import { levelInfo } from "@/lib/gamify";
import {
  UNLOCKABLE_DRILLS,
  isUnlocked,
  nextUnlock,
  type UnlockStats,
  type NextUnlock,
} from "@/lib/unlocks";
import { api } from "@/convex/_generated/api";
import {
  Languages,
  Lock,
  MessagesSquare,
  Mic,
  Shuffle,
  Sparkles,
  TrendingUp,
  Wind,
} from "lucide-react";
import { useQuery } from "convex/react";
import { Link } from "react-router";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * /dashboard — the day at a glance. Today's numbers, today's goals,
 * today's checklist. Training lives in /gym, the record in /progress,
 * the calm side in /calm — this page just orients.
 */
export default function Dashboard() {
  const progression = useQuery(api.dailyLog.progression);

  // Stats drive every panel here (level, unlocks, checklist, next-unlock);
  // render only once they've loaded so a veteran never sees a zeros-frame.
  if (progression === undefined) {
    return (
      <AppShell active="dashboard">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <NBPanel className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Loading your day…</p>
          </NBPanel>
        </div>
      </AppShell>
    );
  }

  const level = levelInfo(progression.totalXp);

  const stats = {
    totalSessions: progression?.totalSessions ?? 0,
    streakDays: progression?.streakDays ?? 0,
    bestOverall: progression?.bestOverall ?? 0,
    drillsTried: progression?.drillsTried ?? 0,
  };

  const unlockStats: UnlockStats = {
    takes: stats.totalSessions,
    level: level.level,
    drillsTried: stats.drillsTried,
    bestScore: stats.bestOverall,
    streak: stats.streakDays,
  };
  const next = nextUnlock(unlockStats);

  const maxWeekXp = Math.max(1, ...(progression?.week ?? []).map((w) => w.xp));
  const weekBars = (progression?.week ?? []).map((w) => ({
    ...w,
    label: DAY_LETTERS[new Date(w.day.replace(/-/g, "/")).getDay()],
    h: Math.round((w.xp / maxWeekXp) * 100),
  }));

  // The daily CTA must always be runnable: when the calendar pick sits
  // behind a lock, swap it for a starter so the checklist's deep link
  // never dead-ends on the lock screen.
  const daily = getAccessibleDailyChallenge((drillId) => {
    const gate = UNLOCKABLE_DRILLS.find((u) => u.id === drillId);
    return !gate || isUnlocked(gate, unlockStats);
  });

  return (
    <AppShell active="dashboard">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        {/* Greeting + headline stats */}
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {dailyLabel()} · your practice
            </p>
            <h1 className="mt-1 font-display text-3xl text-balance sm:text-4xl">
              {level.label}{" "}
              <span className="text-muted-foreground">· level {level.level}</span>
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NBStat label="Total XP" value={progression?.totalXp ?? 0} className="bg-sun" />
            <NBStat label="Takes" value={stats.totalSessions} />
            <NBStat label="Streak" value={stats.streakDays} suffix="d" className="bg-mint" />
            <NBStat
              label="Best score"
              value={stats.bestOverall}
              suffix={stats.bestOverall ? "/100" : undefined}
            />
          </div>
        </section>

        {/* Quick reps — every tool one tap away */}
        <section aria-label="Quick reps">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { to: "/gym", icon: Mic, label: "Quick take", sub: "45s", color: "bg-coral" },
              { to: "/translate", icon: Languages, label: "Translate", sub: "2 passes", color: "bg-sun" },
              { to: "/quiz", icon: MessagesSquare, label: "Read the Room", sub: "1 scenario", color: "bg-mint" },
              { to: "/reframe", icon: Shuffle, label: "Reframe", sub: "2 min", color: "bg-paper" },
              { to: "/calm", icon: Wind, label: "Grounding", sub: `${GROUNDING_EXERCISES.length} exercises`, color: "bg-paper" },
            ].map((rep) => {
              const Icon = rep.icon;
              return (
                <Link
                  key={rep.label}
                  to={rep.to}
                  className="group nb nb-press flex items-center gap-3 bg-card p-3"
                >
                  <span className={`nb flex size-9 shrink-0 items-center justify-center ${rep.color}`}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold leading-tight">{rep.label}</span>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {rep.sub}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Today's two moves: challenge + checklist, side by side */}
        <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="nb relative overflow-hidden bg-sun nb-shadow">
            <div className="flex h-full flex-col justify-between gap-4 p-5">
              <div className="flex items-center gap-4">
                <span className="nb flex size-12 shrink-0 items-center justify-center bg-card">
                  <Sparkles className="size-6" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest">
                    Today's challenge
                  </p>
                  <h2 className="font-display text-lg leading-tight sm:text-xl">
                    {daily.drill.name} — {daily.angle.toLowerCase()}
                  </h2>
                </div>
              </div>
              <p className="text-sm text-ink/70">
                {daily.drill.seconds} seconds, mic on. The full catalog and
                your bests live on the gym floor.
              </p>
              <div>
                <Link to={`/practice/${daily.drill.id}`}>
                  <NBButton variant="ink" className="text-xs">
                    <Mic className="size-3.5" /> Do today's take
                  </NBButton>
                </Link>
              </div>
            </div>
          </div>
          <DailyChecklist todayDrillId={daily.drill.id} />
        </section>

        {/* Next unlock — the one concrete thing to chase next */}
        {next && <NextUnlockPanel next={next} />}

        {/* 21-day arc — where you are in the reprogramming program */}
        <ArcPanel streakDays={stats.streakDays} />

        {/* Progression center */}
        <section id="progress" className="grid gap-6 lg:grid-cols-2">
          <NBPanel className="flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b-2 border-ink px-5 py-3">
              <div className="font-display text-xl">Progression</div>
              <span className="nb inline-flex items-center bg-coral px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                {level.maxed ? "Top tier" : `${level.xpToNext} XP to ${level.nextLabel}`}
              </span>
            </div>
            <div className="flex items-center gap-5 p-5">
              <div className="scale-[2.1]">
                <LevelRing level={level.level} pct={level.progressPct} />
              </div>
              <div className="min-w-0">
                <div className="font-display text-2xl">{level.label}</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {level.into}
                  {level.needed > 0 ? ` / ${level.needed}` : ""} XP this level
                </div>
                <div className="mt-3 flex h-4 gap-[3px]" aria-hidden>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <span
                      key={i}
                      className={`flex-1 ${
                        i < Math.round((level.progressPct / 100) * 10) ? "bg-coral" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </NBPanel>

          {/* Weekly XP chart */}
          <NBPanel className="flex flex-col overflow-hidden">
            <div className="border-b-2 border-ink p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Last 7 days
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {progression?.todayXp ?? 0} XP today
                </p>
              </div>
              <div className="mt-3 flex h-24 items-end gap-2">
                {weekBars.map((b, i) => (
                  <div key={b.day} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      title={`${b.xp} XP`}
                      className={`w-full ${i === weekBars.length - 1 ? "bg-coral" : "bg-ink"}`}
                      style={{ height: `${Math.max(b.h, 4)}%` }}
                    />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                      {b.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-1 items-center justify-between border-t-2 border-ink p-4">
              <p className="text-xs text-muted-foreground">
                Trends, trophies, and every take live on your record.
              </p>
              <Link
                to="/progress"
                className="flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-coral hover:underline"
              >
                <TrendingUp className="size-3.5" /> Progress
              </Link>
            </div>
          </NBPanel>
        </section>
      </div>
    </AppShell>
  );
}

/**
 * The single next unlock: what's behind the lock, the one reachable
 * to-do, and progress toward it.
 */
function NextUnlockPanel({ next }: { next: NextUnlock }) {
  return (
    <div className="nb bg-card nb-shadow">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <span className="nb flex size-11 shrink-0 items-center justify-center bg-ink text-paper">
            <Lock className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Next unlock
            </p>
            <h2 className="font-display text-xl leading-tight">{next.item.name}</h2>
            <p className="text-sm text-muted-foreground">{next.item.blurb}</p>
          </div>
        </div>
        <div className="min-w-[220px] flex-1 sm:max-w-xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <span>{next.goal || "Keep practicing"}</span>
            <span>{next.progressPct}%</span>
          </div>
          <div className="mt-2 h-3 w-full border-2 border-ink bg-muted">
            <div className="h-full bg-mint" style={{ width: `${next.progressPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The 21-day reprogramming arc: your streak maps onto a three-week
 * program (floor → range → translation), so coming back isn't just a
 * checklist — it's a curriculum with a finish line.
 */
function ArcPanel({ streakDays }: { streakDays: number }) {
  const day = Math.max(1, streakDays);
  const stage = arcStageFor(day);
  const left = arcDaysLeft(day);
  const dayPct = Math.min(100, Math.round((day / 21) * 100));

  return (
    <NBPanel className="overflow-hidden">
      <div className="flex items-center justify-between border-b-2 border-ink bg-mint px-5 py-3">
        <div className="font-display">The 21-day reprogramming arc</div>
        <span className="nb inline-flex items-center bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-paper">
          {left > 0 ? `${left} day${left === 1 ? "" : "s"} to go` : "Arc complete — keep the streak"}
        </span>
      </div>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-5">
          <div className="nb flex size-14 shrink-0 flex-col items-center justify-center bg-card">
            <span className="font-display text-xl leading-none">{day}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">day</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-lg">{stage.name}</span>
              <span className="text-xs text-muted-foreground">· {stage.promise}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-bold text-ink">Today's move:</span> {stage.move}
            </p>
          </div>
        </div>

        {/* Stage track: three blocks across 21 days */}
        <div className="mt-4 flex gap-1" aria-hidden>
          {Array.from({ length: 21 }).map((_, i) => {
            const d = i + 1;
            const s = arcStageFor(d);
            const isStage = s.id === stage.id;
            const isDone = d <= day;
            return (
              <span
                key={i}
                title={`Day ${d} — ${s.name}`}
                className={`h-3 flex-1 border border-ink ${
                  isDone ? (isStage ? "bg-ink" : "bg-muted") : "bg-card"
                }`}
              />
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{stage.why}</p>
        <div className="mt-3 h-1.5 bg-muted">
          <div className="h-full bg-ink" style={{ width: `${dayPct}%` }} />
        </div>
      </div>
    </NBPanel>
  );
}
