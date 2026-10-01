import { describe, expect, test } from "bun:test";
import {
  STARTER_DRILLS,
  UNLOCKABLE_DRILLS,
  isUnlocked,
  unlockGoalLine,
  unlockProgressPct,
  nextUnlock,
  buildToneTrends,
  type UnlockStats,
} from "./unlocks";
import { DRILLS } from "./drills";

const base: UnlockStats = {
  takes: 0,
  level: 1,
  drillsTried: 0,
  bestScore: 0,
  streak: 0,
};

describe("unlock catalog integrity", () => {
  test("every unlockable drill id exists in the drill catalog", () => {
    const catalog = new Set(DRILLS.map((d) => d.id));
    for (const u of UNLOCKABLE_DRILLS) {
      expect(catalog.has(u.id)).toBe(true);
    }
  });

  test("starters + unlockables exactly tile the catalog with no overlap", () => {
    const ids = [...STARTER_DRILLS, ...UNLOCKABLE_DRILLS.map((u) => u.id)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(DRILLS.map((d) => d.id)));
    expect(ids.length).toBe(DRILLS.length);
  });

  test("every unlockable has non-trivial copy and at least one gate", () => {
    for (const u of UNLOCKABLE_DRILLS) {
      expect(u.name.trim().length).toBeGreaterThan(3);
      expect(u.blurb.trim().length).toBeGreaterThan(10);
      expect(Object.values(u.req).some((v) => v !== undefined)).toBe(true);
    }
  });

  test("take gates stay reachable (nothing beyond 10 takes)", () => {
    const maxTakes = Math.max(...UNLOCKABLE_DRILLS.map((u) => u.req.takes ?? 0));
    expect(maxTakes).toBeLessThanOrEqual(10);
  });
});

describe("isUnlocked", () => {
  test("starter stats unlock nothing gated", () => {
    for (const u of UNLOCKABLE_DRILLS) {
      expect(isUnlocked(u, base)).toBe(false);
    }
  });

  test("the takes gate opens at exactly the threshold", () => {
    const niceNo = UNLOCKABLE_DRILLS.find((u) => u.id === "nice-no")!;
    expect(isUnlocked(niceNo, { ...base, takes: 2 })).toBe(false);
    expect(isUnlocked(niceNo, { ...base, takes: 3 })).toBe(true);
  });

  test("multi-requirement unlocks need every gate met", () => {
    const deEsc = UNLOCKABLE_DRILLS.find((u) => u.id === "de-escalate")!;
    expect(isUnlocked(deEsc, { ...base, takes: 5, level: 1 })).toBe(false);
    expect(isUnlocked(deEsc, { ...base, takes: 1, level: 2 })).toBe(false);
    expect(isUnlocked(deEsc, { ...base, takes: 5, level: 2 })).toBe(true);
  });

  test("bestScore gate opens at exactly the threshold", () => {
    const praise = UNLOCKABLE_DRILLS.find((u) => u.id === "praise-clear")!;
    expect(isUnlocked(praise, { ...base, bestScore: 59 })).toBe(false);
    expect(isUnlocked(praise, { ...base, bestScore: 60 })).toBe(true);
  });
});

describe("unlockGoalLine", () => {
  test("phrases the takes gap as a to-do", () => {
    const niceNo = UNLOCKABLE_DRILLS.find((u) => u.id === "nice-no")!;
    expect(unlockGoalLine(niceNo, base)).toBe("3 more takes");
    expect(unlockGoalLine(niceNo, { ...base, takes: 2 })).toBe("1 more take");
  });

  test("joins every unmet gate", () => {
    const deEsc = UNLOCKABLE_DRILLS.find((u) => u.id === "de-escalate")!;
    const line = unlockGoalLine(deEsc, base);
    expect(line).toContain("5 more takes");
    expect(line).toContain("reach level 2");
  });

  test("met requirements never appear in the goal line", () => {
    const deEsc = UNLOCKABLE_DRILLS.find((u) => u.id === "de-escalate")!;
    expect(unlockGoalLine(deEsc, { ...base, takes: 5, level: 2 })).toBe("");
  });
});

describe("unlockProgressPct / nextUnlock", () => {
  test("unmet reqs clamp at 0; fully met reqs hit 100", () => {
    const niceNo = UNLOCKABLE_DRILLS.find((u) => u.id === "nice-no")!;
    expect(unlockProgressPct(niceNo, base)).toBe(0);
    expect(unlockProgressPct(niceNo, { ...base, takes: 3 })).toBe(100);
  });

  test("nextUnlock picks the most reachable goal", () => {
    const s: UnlockStats = { takes: 2, level: 1, drillsTried: 2, bestScore: 0, streak: 0 };
    const next = nextUnlock(s)!;
    expect(next.item.id).toBe("nice-no");
    expect(next.goal).toBe("1 more take");
  });

  test("nextUnlock returns null when everything is open", () => {
    const all: UnlockStats = { takes: 99, level: 9, drillsTried: 9, bestScore: 99, streak: 9 };
    expect(nextUnlock(all)).toBeNull();
  });
});

describe("buildToneTrends", () => {
  test("one row per factor, oldest-first scores preserved", () => {
    const rows = buildToneTrends([
      { calmScore: 50, energyScore: 60, clarityScore: 70, stabilityScore: 80 },
      { calmScore: 55, energyScore: 58, clarityScore: 72, stabilityScore: 78 },
    ]);
    expect(rows.map((r) => r.label)).toEqual(["Calm", "Energy", "Clarity", "Stability"]);
    expect(rows[0].scores).toEqual([50, 55]);
  });

  test("direction: up, down, and the flat band", () => {
    const rows = buildToneTrends([
      { calmScore: 50, energyScore: 70, clarityScore: 60, stabilityScore: 65 },
      { calmScore: 60, energyScore: 60, clarityScore: 59, stabilityScore: 66 },
    ]);
    expect(rows[0].direction).toBe("up"); // +10
    expect(rows[1].direction).toBe("down"); // -10
    expect(rows[2].direction).toBe("flat"); // -1, inside the band
    expect(rows[3].direction).toBe("flat"); // +1
  });

  test("caps at the max window", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      calmScore: i,
      energyScore: i,
      clarityScore: i,
      stabilityScore: i,
    }));
    const rows = buildToneTrends(many, 10);
    expect(rows[0].scores.length).toBe(10);
    expect(rows[0].scores[0]).toBe(10); // first of the last 10
  });
});
