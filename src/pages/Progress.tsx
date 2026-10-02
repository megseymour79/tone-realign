import { api } from "../convex/_generated/api";
import { NBBadge, NBPanel, NBMeter } from "@/components/nb";
import { AppShell } from "@/components/AppShell";
import { buildToneTrends } from "@/lib/unlocks";
import { TONE_LABELS } from "@/lib/tone-analyzer";
import { DRILLS } from "@/lib/drills";
import {
  History,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useQuery } from "convex/react";
import { Link } from "react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * /progress — your record. See your tone trends and recent takes.
 * Clean, focused, no clutter.
 */
export default function Progress() {
  const recentSessions = useQuery(api.sessions.listSessions, { limit: 5 });
  const trendSessions = useQuery(api.sessions.listSessions, { limit: 10 });

  return (
    <AppShell active="progress">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-6">
        {/* Heading */}
        <section>
          <h1 className="font-display text-3xl sm:text-4xl">
            Your progress
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A simple view of your last takes.
          </p>
        </section>

        {trendSessions && trendSessions.length >= 2 && (
          <ToneTrendsPanel sessions={trendSessions} />
        )}
        {(!trendSessions || trendSessions.length < 2) && (
          <NBPanel className="bg-card/70 p-5">
            <p className="text-sm text-muted-foreground">
              Record at least two takes to see trends.
            </p>
          </NBPanel>
        )}

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
              Do another →
            </Link>
          </div>
          <div className="flex flex-col">
            {recentSessions === undefined && (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            )}
            {recentSessions?.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">
                No takes yet. Start your first one in the gym.
              </p>
            )}
            {recentSessions?.map((s) => (
              <RecentTakeRow key={s._id} session={s} />
            ))}
          </div>
        </section>

      </div>
    </AppShell>
  );
}

/**
 * Tone trends — per-factor direction over the last 10 takes
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
      </div>
      <p className="px-6 pt-4 text-sm text-muted-foreground">
        Up arrow means that score has improved recently. Down means it dipped.
      </p>
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
              </div>
              <div className="mt-2 flex h-8 items-end gap-1" aria-hidden>
                {r.scores.map((v, i) => (
                  <div
                    key={i}
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
 * One recent take with easy-to-read factor scores.
 */
function RecentTakeRow({
  session: s,
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
}) {
  const [open, setOpen] = useState(false);

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
            <div className="text-sm font-bold">
              {DRILLS.find((d) => d.id === s.drill)?.name ?? s.drill}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
      )}
    </div>
  );
}
