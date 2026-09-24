import { NBBadge, NBButton, NBPanel, NBMeter } from "@/components/nb";
import { MicError } from "@/components/MicError";
import { MicPicker, getSavedMicDeviceId } from "@/components/MicPicker";
import { CoachNote } from "@/components/CoachNote";
import { getDrill, type Drill } from "@/lib/drills";
import { UNLOCKABLE_DRILLS, isUnlocked, unlockGoalLine } from "@/lib/unlocks";
import { getAccessibleDailyChallenge } from "@/lib/daily";
import {
  COUNTDOWN_SECONDS,
  PACE_BAR_CLASS,
  PACE_HINTS,
  pacePct,
  paceStatus,
} from "@/lib/take-timing";
import {
  biggestLever,
  buildFactorFeedback,
  TONE_FACTORS,
  TONE_LABELS,
  type FactorFeedback,
  type ToneAnalysis,
} from "@/lib/tone-analyzer";
import { useToneCapture } from "@/hooks/use-tone-capture";
import { api } from "@/convex/_generated/api";
import {
  ArrowLeft,
  Check,
  Lock,
  Mic,
  MessageSquareText,
  Play,
  Square,
  Target,
  Volume2,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { CONTEXT_PROMPTS } from "@/lib/context-prompts";
import { levelInfo } from "@/lib/gamify";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function Practice() {
  const { drillId } = useParams();
  const drill = drillId ? getDrill(drillId) : undefined;
  const progression = useQuery(api.dailyLog.progression);
  const stats = {
    takes: progression?.totalSessions ?? 0,
    level: levelInfo(progression?.totalXp ?? 0).level,
    drillsTried: progression?.drillsTried ?? 0,
    bestScore: progression?.bestOverall ?? 0,
    streak: progression?.streakDays ?? 0,
  };
  const gate = UNLOCKABLE_DRILLS.find((u) => u.id === drillId);
  // Enforce the lock only once the stats have loaded: with progression
  // still undefined, zeros would falsely lock veterans mid-navigation.
  const lockKnown = progression !== undefined;
  const locked = lockKnown && !!gate && !isUnlocked(gate, stats);

  if (!drill) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <NBPanel className="p-8 text-center">
            <p className="font-display text-xl">We couldn't find that drill</p>
            <Link to="/gym" className="mt-4 inline-block">
              <NBButton variant="paper">Back to the gym</NBButton>
            </Link>
          </NBPanel>
        </div>
      </AppShell>
    );
  }

  if (lockKnown === false && drill) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <NBPanel className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Loading your gym…</p>
          </NBPanel>
        </div>
      </AppShell>
    );
  }

  if (locked) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <NBPanel className="p-8 text-center">
            <Lock className="mx-auto size-8" />
            <p className="mt-3 font-display text-xl">{drill.name} is still locked</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              {gate?.blurb} Unlock it with {gate ? unlockGoalLine(gate, stats) : "practice"} —
              every honest take counts.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link to="/gym">
                <NBButton variant="paper">Back to the gym</NBButton>
              </Link>
              <Link to="/practice/steady-ground">
                <NBButton variant="coral">Do an open drill</NBButton>
              </Link>
            </div>
          </NBPanel>
        </div>
      </AppShell>
    );
  }

  // Keyed by drillId: switching drills remounts the runner, which resets
  // capture and saved state cleanly instead of via setState-in-effect.
  const isDaily = getAccessibleDailyChallenge((id) => {
    const g = UNLOCKABLE_DRILLS.find((u) => u.id === id);
    return !g || isUnlocked(g, stats);
  }).drill.id === drillId;
  return <PracticeRunner key={drillId} drill={drill} isDaily={isDaily} />;
}

function PracticeRunner({ drill, isDaily }: { drill: Drill; isDaily: boolean }) {
  const capture = useToneCapture();
  const [saved, setSaved] = useState(false);
  // The user's own context: what this take is responding to or opening.
  const [context, setContext] = useState("");
  const [expandedFactor, setExpandedFactor] = useState<
    "calm" | "energy" | "clarity" | "stability" | null
  >(null);
  const drillStats = useQuery(api.sessions.drillStats);
  const bestByDrill = new Map((drillStats ?? []).map((s) => [s.drill, s]));

  // Pre-roll countdown: hit Start, breathe for three beats, then the
  // recorder actually opens. State lives here (UI choreography), the
  // capture hook stays a pure clock. The hook object is unstable across
  // renders, so the effect reads it through a ref — a mid-countdown
  // re-render must never reset the ticking timer.
  const [countdown, setCountdown] = useState<number | null>(null);
  const captureRef = useRef(capture);
  captureRef.current = capture;
  const beginCountdown = () => {
    setCountdown(COUNTDOWN_SECONDS);
  };
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      const c = captureRef.current;
      c.start(c.lastPeakRawRms, getSavedMicDeviceId());
      return;
    }
    const t = window.setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => window.clearTimeout(t);
  }, [countdown]);

  // Space toggles record/stop — the desktop flow never leaves the keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(el.tagName)) return;
      e.preventDefault();
      const c = captureRef.current;
      if (c.state === "idle" && countdown === null) beginCountdown();
      else if (c.state === "recording") c.stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [countdown]);

  // Landing on the results: the reveal draws the eye to the verdict.
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const prevAnalysis = useRef(capture.analysis);
  useEffect(() => {
    if (capture.analysis && capture.analysis !== prevAnalysis.current) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    prevAnalysis.current = capture.analysis;
  }, [capture.analysis]);

  // Pacing guidance against the drill's suggested length.
  const targetMs = drill.seconds * 1000;
  const pace = paceStatus(capture.elapsedMs, targetMs);
  const pct = pacePct(capture.elapsedMs, targetMs);

  const {
    state,
    error,
    level,
    livePitchHz,
    elapsedMs,
    analysis,
    transcript,
    lastPeakRawRms,
    activeDeviceLabel,
    micMuted,
    audioUrl,
    start,
    stop,
    reset,
  } = capture;

  return (
    <AppShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 pb-10 pt-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link to="/gym">
            <NBButton variant="paper" className="px-3 py-2">
              <ArrowLeft className="size-4" /> Gym
            </NBButton>
          </Link>
          <div className="flex items-center gap-2">
            {isDaily && <NBBadge className="bg-coral">★ Today's challenge</NBBadge>}
            <NBBadge className="bg-sun">{drill.tag}</NBBadge>
          </div>
        </div>

        {/* Drill header */}
        <NBPanel className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl">{drill.name}</h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {drill.focus}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Mic className="size-5" />
              <span className="font-display text-lg">{fmtTime(elapsedMs)}</span>
              <span className="text-xs font-bold text-muted-foreground">
                / {fmtTime(drill.seconds * 1000)}
              </span>
            </div>
          </div>
          <div className="mt-4 nb bg-secondary p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Your prompt
            </p>
            <p className="mt-1 font-medium leading-relaxed">{drill.prompt}</p>
          </div>
        </NBPanel>

        {/* Recorder */}
        <NBPanel className="p-6">
          <div className="flex flex-col items-center gap-5">
            {/* Pre-roll countdown overlay */}
            {countdown !== null && state === "idle" && (
              <div
                className="flex h-24 w-full flex-col items-center justify-center"
                aria-live="assertive"
              >
                <motion.span
                  key={countdown}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="nb flex size-16 items-center justify-center bg-sun font-display text-4xl nb-shadow"
                >
                  {countdown}
                </motion.span>
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Breathe in… speak on the exhale
                </p>
              </div>
            )}

            {/* Live visualizer */}
            {countdown === null && (
              <div
                className="flex h-24 w-full items-end justify-center gap-1"
                aria-hidden
              >
                {Array.from({ length: 28 }).map((_, i) => {
                  const wave =
                    state === "recording"
                      ? Math.max(
                          level *
                            (0.4 +
                              0.6 *
                                Math.abs(
                                  Math.sin(i * 0.9 + elapsedMs / 180),
                                )),
                          0.06,
                        )
                      : 0.06;
                  const heightPct = Math.min(wave * 100, 100);
                  return (
                    <div
                      key={i}
                      className={
                        i >= 8 && i <= 19 ? "w-2.5 bg-coral" : "w-2.5 bg-ink/70"
                      }
                      style={{ height: `${Math.max(heightPct, 6)}%` }}
                    />
                  );
                })}
              </div>
            )}

            {/* Target pacing meter — where you are against the drill's length */}
            {state === "recording" && (
              <div className="w-full">
                <div className="h-3 w-full nb bg-card overflow-hidden">
                  <div
                    className={cn("h-full transition-[width] duration-300", PACE_BAR_CLASS[pace])}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Target className="size-3.5" /> {PACE_HINTS[pace]}
                  </span>
                  <span>
                    {fmtTime(elapsedMs)} / {fmtTime(targetMs)}
                  </span>
                </div>
              </div>
            )}

            {state === "recording" && (
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Live pitch · {livePitchHz ? `${Math.round(livePitchHz)} Hz` : "listening for you…"}
                {level < 0.06 && elapsedMs > 3000 && " · we can barely hear you — move closer"}
              </p>
            )}

            {error && <MicError message={error} />}

            {state === "recording" && micMuted && (
              <p className="nb bg-sun px-3 py-2 text-sm font-medium">
                The mic reports itself muted — check your system's mic privacy
                setting or close the app holding it; this take will come back
                empty otherwise.
              </p>
            )}

            <MicPicker activeLabel={activeDeviceLabel} />

            {/* Controls */}
            <div className="flex items-center gap-3">
              {state === "idle" && (
                <NBButton
                  onClick={beginCountdown}
                  disabled={countdown !== null}
                  variant="coral"
                >
                  <Mic className="size-4" /> Start my take
                </NBButton>
              )}
              {state === "recording" && (
                <NBButton onClick={stop} variant="ink">
                  <Square className="size-4" /> Done — score it
                </NBButton>
              )}
              {state === "analyzing" && (
                <NBButton disabled variant="ink">
                  Analyzing…
                </NBButton>
              )}
              {state === "done" && (
                <NBButton onClick={reset} variant="paper">
                  Go again
                </NBButton>
              )}
            </div>
            <p className="hidden text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:block">
              Tip: press Space to start / stop
            </p>
          </div>
        </NBPanel>

        {/* The user's context — what this take is responding to or opening. */}
        <NBPanel className="bg-secondary p-6">
          <div className="flex items-center gap-2">
            <MessageSquareText className="size-5" />
            <p className="font-display text-xl">Your context</p>
          </div>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Tell the mic what the take is for — who it's aimed at, what you're
            responding to or opening. It gets saved with the take and your
            coach reads it, so the advice lands on your moment, not a made-up
            one.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {CONTEXT_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setContext(context === p ? "" : p)}
                aria-pressed={context === p}
                className={cn(
                  "nb nb-press px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors",
                  context === p
                    ? "bg-sun text-ink"
                    : "bg-card text-muted-foreground hover:text-ink",
                )}
              >
                {p}
                {context === p && <span aria-hidden className="ml-1.5">×</span>}
              </button>
            ))}
          </div>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g. my manager messaged “we need to talk” and I'm rehearsing my reply"
            rows={3}
            className="nb mt-4 w-full bg-card p-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Optional — but a coach that knows the room coaches better.
          </p>
        </NBPanel>

        {/* Results */}
        {state === "done" && analysis && (
          <div ref={resultsRef}>
            <NBPanel className="p-6">
              {/* The one highest-leverage fix for next time. */}
              <div className="nb mb-5 bg-sun p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest">
                  Biggest lever — work this one thing next take
                </p>
                <p className="mt-1 text-sm font-medium">
                  {biggestLever(analysis).tip}
                </p>
              </div>

              {audioUrl && (
                <div className="nb mb-5 bg-card p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Volume2 className="size-4" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Your take
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Playback
                    </span>
                  </div>
                  <audio controls src={audioUrl} className="mt-3 w-full" />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <NBBadge
                    className={
                      TONE_LABELS[analysis.dominantTone]?.color ?? "bg-secondary"
                    }
                  >
                    {TONE_LABELS[analysis.dominantTone]?.label ??
                      analysis.dominantTone}
                  </NBBadge>
                  <p className="max-w-md text-sm text-muted-foreground">
                    {TONE_LABELS[analysis.dominantTone]?.note}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Overall
                  </div>
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 }}
                    className="font-display text-5xl"
                  >
                    {analysis.overallScore}
                  </motion.div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="nb bg-secondary p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Detailed tone description
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {TONE_LABELS[analysis.dominantTone]?.note}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed">
                    This take reads as <span className="font-bold">{TONE_LABELS[analysis.dominantTone]?.label ?? analysis.dominantTone}</span> — the strongest next move is to work on the weakest factor below and keep the line steady instead of chasing volume or speed.
                  </p>
                </div>
                <div className="nb bg-secondary p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Highest impact fix
                  </p>
                  <p className="mt-2 text-sm leading-relaxed">
                    {biggestLever(analysis).tip}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    <Play className="size-3.5" />
                    Listen back once before your next take
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["calm", analysis.calmScore],
                    ["energy", analysis.energyScore],
                    ["clarity", analysis.clarityScore],
                    ["stability", analysis.stabilityScore],
                  ] as const
                ).map(([key, score]) => {
                  const factor = TONE_FACTORS[key];
                  const open = expandedFactor === key;
                  return (
                    <div key={key} className="nb bg-card p-3">
                      <button
                        type="button"
                        onClick={() => setExpandedFactor(open ? null : key)}
                        aria-expanded={open}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <span className="text-xs font-bold uppercase tracking-widest">
                          {factor.label}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-display text-xl">{score}</span>
                          <span
                            aria-hidden
                            className={cn(
                              "text-[10px] font-bold transition-transform",
                              open && "rotate-180",
                            )}
                          >
                            ▼
                          </span>
                        </span>
                      </button>
                      <NBMeter value={score} className="mt-2" />
                      {open && (
                        <div className="mt-3 flex flex-col gap-3 border-t-2 border-dashed border-ink/20 pt-3 text-sm">
                          {(() => {
                            const fb: FactorFeedback =
                              buildFactorFeedback(analysis)[key];
                            const STATUS_STYLES: Record<
                              FactorFeedback["status"],
                              string
                            > = {
                              strong: "bg-mint",
                              decent: "bg-sun",
                              wobbly: "bg-paper",
                              rough: "bg-coral",
                            };
                            return (
                              <>
                                <p>
                                  <span
                                    className={cn(
                                      "nb mr-2 inline-block bg-card px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                                      STATUS_STYLES[fb.status],
                                    )}
                                  >
                                    {fb.status}
                                  </span>
                                  <span>{fb.read}</span>
                                </p>
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                  Your numbers: {fb.yourNumbers}
                                </p>
                                <p>
                                  <span className="font-bold">Practice this: </span>
                                  <span className="text-muted-foreground">{fb.tip}</span>
                                </p>
                                <p>
                                  <span className="font-bold">How it's rated: </span>
                                  <span className="text-muted-foreground">{factor.how}</span>
                                </p>
                                <p>
                                  <span className="font-bold">The goal: </span>
                                  <span className="text-muted-foreground">{factor.goal}</span>
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div className="nb bg-secondary p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Pitch
                  </div>
                  <div className="font-display text-lg">{analysis.avgPitchHz} Hz</div>
                </div>
                <div className="nb bg-secondary p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Range
                  </div>
                  <div className="font-display text-lg">{analysis.pitchRangeHz} Hz</div>
                </div>
                <div className="nb bg-secondary p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Pace
                  </div>
                  <div className="font-display text-lg">{analysis.wordsPerMinute} wpm</div>
                </div>
                <div className="nb bg-secondary p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Voiced
                  </div>
                  <div className="font-display text-lg">
                    {Math.round(analysis.voicedRatio * 100)}%
                  </div>
                </div>
              </div>

              <SaveRow
                analysis={analysis}
                drillId={drill.id}
                elapsedMs={elapsedMs}
                transcript={transcript}
                context={context.trim() || undefined}
                saved={saved}
                onSaved={() => setSaved(true)}
                onRetry={reset}
                drillStats={bestByDrill.get(drill.id)}
              />
            </NBPanel>
          </div>
        )}

        {/* Tips */}
        <NBPanel className="bg-secondary p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Before you start
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {drill.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="nb flex size-5 shrink-0 items-center justify-center bg-sun text-[10px] font-bold">
                  {i + 1}
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </NBPanel>
      </div>
    </AppShell>
  );
}

function SaveRow({
  analysis,
  drillId,
  elapsedMs,
  transcript,
  context,
  saved,
  onSaved,
  onRetry,
  drillStats,
}: {
  analysis: ToneAnalysis;
  drillId: string;
  elapsedMs: number;
  transcript: string;
  context?: string;
  saved: boolean;
  onSaved: () => void;
  onRetry: () => void;
  drillStats?: { bestScore: number; attemptCount: number };
}) {
  const saveSession = useMutation(api.sessions.saveSession);
  const markTake = useMutation(api.dailyLog.mark);
  const addBonus = useMutation(api.dailyLog.addBonus);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<Id<"practiceSessions"> | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Credit the daily checklist + a personal-best bonus when earned.
      try {
        await markTake({ action: "take" });
      } catch { /* checklist credit is best-effort */ }
      if (analysis.overallScore >= (drillStats?.bestScore ?? 0)) {
        addBonus({ amount: 25 }).catch(() => {});
      }
      const sessionId = await saveSession({
        drill: drillId,
        durationMs: Math.round(elapsedMs),
        calmScore: analysis.calmScore,
        energyScore: analysis.energyScore,
        clarityScore: analysis.clarityScore,
        stabilityScore: analysis.stabilityScore,
        overallScore: analysis.overallScore,
        avgPitchHz: analysis.avgPitchHz,
        pitchRangeHz: analysis.pitchRangeHz,
        avgVolume: analysis.avgVolume,
        volumeVariability: analysis.volumeVariability,
        wordsPerMinute: analysis.wordsPerMinute,
        voicedRatio: analysis.voicedRatio,
        dominantTone: analysis.dominantTone,
        transcript: transcript || undefined,
        scenario: context,
      });
      setSavedId(sessionId);
      toast.success("Saved. It's in your log.");
      onSaved();
    } catch {
      toast.error("Couldn't save that one. Give it another go.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!saved ? (
          <NBButton onClick={handleSave} disabled={saving} variant="mint">
            {saving ? "Saving…" : "Add to my log"}
          </NBButton>
        ) : (
          <span className="nb inline-flex items-center gap-1 bg-mint px-3 py-2 text-sm font-bold">
            <Check className="size-4" /> Saved
          </span>
        )}
        <NBButton onClick={onRetry} variant="paper">
          Not my best — again
        </NBButton>
      </div>
      {savedId && <CoachNote sessionId={savedId} />}
    </>
  );
}
