import { DRILLS, type Drill } from "./drills";
import { STARTER_DRILLS } from "./unlocks";

/**
 * The daily challenge: one drill + one focus, deterministic per calendar day.
 * Everyone's on the same page each morning — same exercise, fresh angle —
 * which is what turns a visit into a habit.
 */

export interface DailyChallenge {
  /** Stable id: rotation over drills, index-of-day over angles. */
  drill: Drill;
  /** Today's angle on the drill — different every day, same drill id. */
  angle: string;
  /** Short phrase for the streak strip / badges. */
  tag: string;
}

/**
 * The angle on today's drill changes daily even when the drill repeats:
 * with the full drill catalog and 7 angles, the combo cycles every
 * DRILLS.length × 7 days.
 */
const ANGLES = [
  "Half volume, all meaning",
  "Exhale first, then speak",
  "Land the last word",
  "Slow the middle sentence",
  "Smile you can hear",
  "One pause, held fully",
  "Speak like it's already fine",
];

const TAGS = [
  "steady practice",
  "warm practice",
  "boundary practice",
  "recovery practice",
  "patient practice",
];

/** Days since epoch — stable across reloads, changes at local midnight. */
export function dayNumber(): number {
  const now = new Date();
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor(local.getTime() / 86_400_000);
}

/** Pick today's challenge. Pure function of the calendar date. */
export function getDailyChallenge(day = dayNumber()): DailyChallenge {
  const drill = DRILLS[day % DRILLS.length];
  const angle = ANGLES[Math.floor(day / DRILLS.length) % ANGLES.length];
  const tag = TAGS[Math.floor(day / (DRILLS.length * 2)) % TAGS.length];
  return { drill, angle, tag };
}

/**
 * Today's challenge that every user can actually run: the calendar pick,
 * swapped for a starter drill when the pick sits behind a progressive
 * unlock. Keeps the daily CTA honest for new users without changing
 * the rotation for anyone with a full gym.
 */
export function getAccessibleDailyChallenge(
  isDrillUnlocked: (drillId: string) => boolean,
  day = dayNumber(),
): DailyChallenge {
  const challenge = getDailyChallenge(day);
  if (isDrillUnlocked(challenge.drill.id)) return challenge;

  // Deterministic starter fallback: rotate the starters by day so the
  // fallback varies across days too.
  const starter = DRILLS.find(
    (d) => d.id === STARTER_DRILLS[day % STARTER_DRILLS.length],
  );
  if (!starter) return challenge; // defensive: starters must exist
  return { drill: starter, angle: challenge.angle, tag: challenge.tag };
}

/** "Friday, September 13" style label for the challenge card. */
export function dailyLabel(day = dayNumber()): string {
  return new Date(day * 86_400_000).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** For tests and rotation sanity. */
export const DAILY_ANGLES = ANGLES;
export const DAILY_TAGS = TAGS;

/** Test hook for the day number (deterministic fallback coverage). */
export const __dayNumberForTest = dayNumber;
