/**
 * Progressive unlocking — the reason to come back tomorrow.
 *
 * Three core drills start free; everything else is earned with real
 * practice: takes logged, variety across drills, level-ups, and a
 * personal record. Each locked item shows one visible next goal
 * ("1 more take to unlock Bring It Down"), so there is always a
 * concrete, reachable thing to do next — and something new waiting
 * behind it once it's done.
 */

// ---- Milestone requirements (pure data, unit-testable) ----

export interface UnlockReq {
  /** Takes logged across any drills. */
  takes?: number;
  /** Account level (from gamify.levelInfo). */
  level?: number;
  /** Distinct drills attempted. */
  drillsTried?: number;
  /** Best overall score on any single take. */
  bestScore?: number;
  /** Days of practice in a row (1 = any take today counts). */
  streak?: number;
}

export interface Unlockable {
  id: string;
  /** What the user sees when it's still locked. */
  name: string;
  /** One-line tease of what's behind the lock. */
  blurb: string;
  req: UnlockReq;
}

/** Drills that are free from the first minute. */
export const STARTER_DRILLS = ["steady-ground", "warm-open", "firm-clear"];

/** The rest of the gym, each gated behind a real milestone. */
export const UNLOCKABLE_DRILLS: Unlockable[] = [
  {
    id: "nice-no",
    name: "The Kind No",
    blurb: "Say no warmly — and let the pause be the answer.",
    req: { takes: 3 },
  },
  {
    id: "unruffled",
    name: "Un-Ruffled",
    blurb: "Take a jab without matching its energy.",
    req: { drillsTried: 2 },
  },
  {
    id: "de-escalate",
    name: "Bring It Down",
    blurb: "Lower and slower when the room gets loud.",
    req: { takes: 5, level: 2 },
  },
  {
    id: "praise-clear",
    name: "Name the Good",
    blurb: "Praise that lands fully instead of dying in a mumble.",
    req: { bestScore: 60 },
  },
  {
    id: "recovery",
    name: "The Clean Recovery",
    blurb: "Snap, reset, and model the tone you meant.",
    req: { takes: 8, level: 3 },
  },
];

// ---- Feature unlocks (beyond the drill catalog) ----

/**
 * Tone trends unlock after a few takes — it needs a handful of scores
 * before a trend means anything.
 */
export const TRENDS_UNLOCK: Unlockable = {
  id: "tone-trends",
  name: "Tone trends",
  blurb: "Your calm, energy, clarity and stability over time — see which way each is moving.",
  req: { takes: 5 },
};

/** Everything that can be locked, for the next-goal chooser. */
const ALL_UNLOCKABLES = [...UNLOCKABLE_DRILLS, TRENDS_UNLOCK];

// ---- Evaluation ----

export interface UnlockStats {
  takes: number;
  level: number;
  drillsTried: number;
  bestScore: number;
  streak: number;
}

/** True when every requirement of the unlock is satisfied. */
export function isUnlocked(u: Unlockable, s: UnlockStats): boolean {
  return (
    (u.req.takes === undefined || s.takes >= u.req.takes) &&
    (u.req.level === undefined || s.level >= u.req.level) &&
    (u.req.drillsTried === undefined || s.drillsTried >= u.req.drillsTried) &&
    (u.req.bestScore === undefined || s.bestScore >= u.req.bestScore) &&
    (u.req.streak === undefined || s.streak >= u.req.streak)
  );
}

/**
 * Build the next-goal line for a locked item: the single most reachable
 * unmet requirement, phrased as what the user still needs.
 */
export function unlockGoalLine(u: Unlockable, s: UnlockStats): string {
  const parts: string[] = [];
  if (u.req.takes !== undefined && s.takes < u.req.takes) {
    const left = u.req.takes - s.takes;
    parts.push(`${left} more take${left === 1 ? "" : "s"}`);
  }
  if (u.req.level !== undefined && s.level < u.req.level) {
    parts.push(`reach level ${u.req.level}`);
  }
  if (u.req.drillsTried !== undefined && s.drillsTried < u.req.drillsTried) {
    const left = u.req.drillsTried - s.drillsTried;
    parts.push(`try ${left} more drill${left === 1 ? "" : "s"}`);
  }
  if (u.req.bestScore !== undefined && s.bestScore < u.req.bestScore) {
    parts.push(`score ${u.req.bestScore}+ on a take`);
  }
  if (u.req.streak !== undefined && s.streak < u.req.streak) {
    parts.push(`a ${u.req.streak}-day streak`);
  }
  return parts.join(" · ");
}

export interface NextUnlock {
  item: Unlockable;
  /** The most-reachable unmet requirement, phrased as a to-do. */
  goal: string;
  /** 0–100 progress toward this specific unlock (met reqs count as full). */
  progressPct: number;
}

/**
 * The single next goal to show on the dashboard: the locked item whose
 * requirements are closest to met. Returns null when everything is open.
 */
export function nextUnlock(s: UnlockStats): NextUnlock | null {
  let best: NextUnlock | null = null;
  for (const item of ALL_UNLOCKABLES) {
    if (isUnlocked(item, s)) continue;
    const goal = unlockGoalLine(item, s);
    const pct = unlockProgressPct(item, s);
    if (!best || pct > best.progressPct) best = { item, goal, progressPct: pct };
  }
  return best;
}

/** Progress toward one unlock's requirements (0–100). */
export function unlockProgressPct(u: Unlockable, s: UnlockStats): number {
  const parts: number[] = [];
  const ratio = (have: number, need: number) => Math.max(0, Math.min(1, have / need));
  if (u.req.takes !== undefined) parts.push(ratio(s.takes, u.req.takes));
  if (u.req.level !== undefined) parts.push(ratio(s.level, u.req.level));
  if (u.req.drillsTried !== undefined) parts.push(ratio(s.drillsTried, u.req.drillsTried));
  if (u.req.bestScore !== undefined) parts.push(ratio(s.bestScore, u.req.bestScore));
  if (u.req.streak !== undefined) parts.push(ratio(s.streak, u.req.streak));
  if (parts.length === 0) return 100;
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
}

// ---- Tone trends (the level-2 feature) ----

export interface TrendSeries {
  label: string;
  /** Recent scores, oldest first. */
  scores: number[];
  /** Difference of last vs first; negative = down. */
  delta: number;
  direction: "up" | "down" | "flat";
}

const TREND_FACTORS: { key: "calmScore" | "energyScore" | "clarityScore" | "stabilityScore"; label: string }[] = [
  { key: "calmScore", label: "Calm" },
  { key: "energyScore", label: "Energy" },
  { key: "clarityScore", label: "Clarity" },
  { key: "stabilityScore", label: "Stability" },
];

/** Flat threshold: |delta| <= 2 points reads as holding steady. */
const FLAT_BAND = 2;

/**
 * Per-factor trend from the most recent N sessions (oldest first).
 * Returns one row per factor with direction and delta.
 */
export function buildToneTrends(
  sessions: { calmScore: number; energyScore: number; clarityScore: number; stabilityScore: number }[],
  max = 10,
): TrendSeries[] {
  const recent = sessions.slice(-max);
  return TREND_FACTORS.map(({ key, label }) => {
    const scores = recent.map((s) => s[key]);
    const first = scores[0];
    const last = scores[scores.length - 1];
    const delta = last - first;
    const direction = Math.abs(delta) <= FLAT_BAND ? "flat" : delta > 0 ? "up" : "down";
    return { label, scores, delta, direction };
  });
}
