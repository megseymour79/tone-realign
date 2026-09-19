import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { NBBadge, NBPanel, NBMeter } from "@/components/nb";
import { AppShell } from "@/components/AppShell";
import { ACHIEVEMENTS, levelInfo, type AchievementStats } from "@/lib/gamify";
import { TRENDS_UNLOCK, buildToneTrends, isUnlocked, type UnlockStats } from "@/lib/unlocks";
import { TONE_LABELS } from "@/lib/tone-analyzer";
import { DRILLS } from "@/lib/drills";
import {
  History,
  Lock,
  Minus,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useQuery } from "convex/react";
import { Link } from "react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * /progress — the record. Trends, trophies, and the take log: everything
 * about looking back, separated from the dashboard's everything-at-once.
 */
export default function Progress() {
  const progression = useQuery(api.dailyLog.progression);
  const recentSessions = useQuery(api.sessions.listSessions, { limit: 5 });
  const trendSessions = useQuery(api.sessions.listSessions, { limit: 10 });
  const drillStats = useQuery(api.sessions.drillStats);

  const level = levelInfo(progression?.totalXp ?? 0);
  const bestByDrill = new Map((drillStats ?? []).map((s) => [s.drill, s]));

  const stats: AchievementStats = {
    totalSessions: progression?.totalSessions ?? 0,
    totalMinutes: progression?.totalMinutes ?? 0,
    bestOverall: progression?.bestOverall ?? 0,
    totalQuiz: progression?.totalQuiz ?? 0,
    totalReframes: progression?.totalReframes ?? 0,
    totalResets: progression?.totalResets ?? 0,
    streakDays: progression?.streakDays ?? 0,
    drillsTried: progression?.drillsTried ?? 0,
    drills: progression?.drills ?? DRILLS.length,
  };
  const earned = new Set(
    ACHIEVEMENTS.filter((a) => a.test(stats)).map((a) => a.id),
  );

  const unlockStats: UnlockStats = {
    takes: stats.totalSessions,
    level: level.level,
    drillsTried: stats.drillsTried,
    bestScore: stats.bestOverall,
    streak: stats.streakDays,
  };
  const trendsUnlocked = isUnlocked(TRENDS_UNLOCK, unlockStats);

  return (
    <AppShell active="progress">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        {/* Heading */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Your record
          </p>
          <h1 className="mt-1 font-display text-3xl text-balance sm:text-4xl">
            Proof it's <span className="italic text-sun">working</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Trends, trophies, and every take — the long view of the training.
          </p>
        </section>

        {/* Tone trends — unlocked after 5 takes; trends need history */}
        {trendsUnlocked && trendSessions && trendSessions.length >= 2 && (
          <ToneTrendsPanel sessions={trendSessions} />
        )}
        {!trendsUnlocked && (
          <NBPanel className="bg-card/70 p-5">
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-ink">Tone trends unlock at 5 takes</span>{" "}
              — direction per factor needs history to be honest. You're at{" "}
              {stats.totalSessions}.
            </p>
          </NBPanel>
        )}

        {/* Trophy shelf — collapsed by default */}
        <details className="nb group bg-card nb-shadow">
          <summary className="flex cursor-pointer list-none items-center justify-between border-b-2 border-ink px-6 py-4 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-2 font-display text-xl">
              <Trophy className="size-5" /> Trophy shelf
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {earned.size} of {ACHIEVEMENTS.length} earned
              </span>
            </div>
            <span
              aria-hidden
              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-transform group-open:rotate-180"
            >
              open ▼
            </span>
          </summary>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {ACHIEVEMENTS.map((a) => {
              const has = earned.has(a.id);
              return (
                <div
                  key={a.id}
                  className={`nb flex items-start gap-3 p-3 ${has ? "bg-card" : "bg-card/50"}`}
                >
                  <span
                    className={`nb flex size-9 shrink-0 items-center justify-center ${
                      has
                        ? a.tier === "gold"
                          ? "bg-sun"
                          : a.tier === "silver"
                            ? "bg-mint"
                            : "bg-coral"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {has ? <Trophy className="size-4" /> : <Lock className="size-4" />}
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{a.name}</span>
                    <span className="block text-xs text-muted-foreground">{a.detail}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </details>

        {/* Recent takes */}
        <section className="nb bg-card nb-shadow">
          <div className="flex items-center justify-between border-b-2 border-ink px-6 py-4">
            <div className="flex items-center gap-2 font-display text-xl">
              <History className="size-5" /> Recent takes
            </div>
            <Link
              to="/gym"
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-ink"
            >
              Pick a drill →
            </Link>
          </div>
          <div className="flex flex-col">
            {recentSessions === undefined && (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            )}
            {recentSessions?.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">
                Nothing here yet. Your first take is one click away.
              </p>
            )}
            {recentSessions?.map((s) => (
              <RecentTakeRow key={s._id} session={s} best={bestByDrill.get(s.drill)} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

/**
 * Tone trends — per-factor direction over the last 10 takes: which way
 * each score is moving.
 */
function ToneTrendsPanel({
  sessions,
}: {
  sessions: {
    _id: string;
    calmScore: number;
    energyScore: number;
    clarityScore: number;
    stabilityScore: number;
  }[];
}) {
  // listSessions returns newest-first; trends read oldest → newest.
  const rows = buildToneTrends([...sessions].reverse());
  const icons = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;
  const colors = {
    up: "text-mint",
    down: "text-coral",
    flat: "text-muted-foreground",
  } as const;

  return (
    <section className="nb bg-card nb-shadow">
      <div className="flex items-center justify-between border-b-2 border-ink px-6 py-4">
        <div className="flex items-center gap-2 font-display text-xl">
          <TrendingUp className="size-5" /> Tone trends
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          last {rows[0]?.scores.length ?? 0} takes
        </p>
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((r) => {
          const Icon = icons[r.direction];
          return (
            <div key={r.label} className="nb bg-secondary p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest">{r.label}</span>
                <Icon className={cn("size-4", colors[r.direction])} />
              </div>
              <div className="mt-1 font-display text-2xl">
                {r.scores[r.scores.length - 1]}
                {r.delta !== 0 && (
                  <span
                    className={cn(
                      "ml-2 text-xs font-bold",
                      r.direction === "up" ? "text-mint" : r.direction === "down" ? "text-coral" : "text-muted-foreground",
                    )}
                  >
                    {r.delta > 0 ? "+" : ""}{r.delta}
                  </span>
                )}
              </div>
              <div className="mt-2 flex h-8 items-end gap-1" aria-hidden>
                {r.scores.map((v, i) => (
                  <div
                    key={i}
                    title={`${r.label} ${v}`}
                    className="min-w-[3px] flex-1 bg-ink/70"
                    style={{ height: `${Math.max(v, 4)}%` }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * One recent take: tone badge, drill, live metrics, and your delta vs.
 * that drill's best — expandable to the four factor scores so the log
 * reads as progress, not a pile of numbers.
 */
function RecentTakeRow({
  session: s,
  best,
}: {
  session: {
    _id: string;
    drill: string;
    overallScore: number;
    calmScore: number;
    energyScore: number;
    clarityScore: number;
    stabilityScore: number;
    wordsPerMinute: number;
    avgPitchHz: number;
    voicedRatio: number;
    dominantTone: string;
  };
  best?: { bestScore: number; attemptCount: number };
}) {
  const [open, setOpen] = useState(false);
  const delta = best ? s.overallScore - best.bestScore : null;
  const isNewBest = delta !== null && delta > 0;

  const factors = [
    { label: "Calm", score: s.calmScore },
    { label: "Energy", score: s.energyScore },
    { label: "Clarity", score: s.clarityScore },
    { label: "Stability", score: s.stabilityScore },
  ];

  return (
    <div className="border-b border-ink/10 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-secondary/60"
      >
        <div className="flex items-center gap-3">
          <NBBadge className={TONE_LABELS[s.dominantTone]?.color ?? "bg-secondary"}>
            {TONE_LABELS[s.dominantTone]?.label ?? s.dominantTone}
          </NBBadge>
          <div>
            <div className="flex items-center gap-2 text-sm font-bold">
              {DRILLS.find((d) => d.id === s.drill)?.name ?? s.drill}
              {isNewBest && (
                <NBBadge className="bg-sun">
                  <TrendingUp className="size-3" /> new best
                </NBBadge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {s.wordsPerMinute} wpm · {s.avgPitchHz} Hz ·{" "}
              {Math.round(s.voicedRatio * 100)}% voiced
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {delta !== null && (
            <span
              className={cn(
                "text-xs font-bold uppercase tracking-widest",
                delta > 0 ? "text-mint" : delta < 0 ? "text-muted-foreground" : "text-ink",
              )}
            >
              {delta > 0 ? `+${delta} vs best` : delta < 0 ? `${delta} vs best` : "= best"}
            </span>
          )}
          <div className="font-display text-2xl">{s.overallScore}</div>
          <span
            aria-hidden
            className={cn(
              "text-[10px] font-bold text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          >
            ▼
          </span>
        </div>
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-3 border-t border-dashed border-ink/20 bg-secondary/50 px-6 py-4 sm:grid-cols-4">
          {factors.map((f) => (
            <div key={f.label}>
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {f.label}
                </span>
                <span className="font-display text-lg">{f.score}</span>
              </div>
              <NBMeter value={f.score} className="mt-1 h-2" barClassName="bg-ink" />
            </div>
          ))}
        </div>
<DeleteAccountSection />
      )}
   
function DeleteAccountSection() {
  const deleteAccount = useMutation(api.users.deleteAccount);

  const handleDelete = async () => {
    if (confirm("Are you sure? This will permanently delete your account and all associated data.")) {
      await deleteAccount();
      window.location.href = "/";
    }
  };

  return (
    <div className="border-t border-red-200 pt-6 mt-12 mb-8">
      <h3 className="text-sm font-semibold text-red-600 mb-2">Danger Zone</h3>
      <p className="text-xs text-neutral-500 mb-4">
        Permanently remove your account and all stored preferences.
      </p>
      <button
        onClick={handleDelete}
        className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 transition-colors"
      >
        Delete Account
      </button>
    </div>
  );
}</div>
  );
}
