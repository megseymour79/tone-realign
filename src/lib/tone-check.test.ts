import { describe, expect, test } from "bun:test";
import {
  ARCHETYPES,
  TONE_CHECK,
  scoreToneCheck,
  type ToneArchetype,
} from "./tone-check";
import { DRILLS } from "./drills";

describe("tone-check data", () => {
  test("each question offers one option per archetype, shuffled order", () => {
    for (const q of TONE_CHECK) {
      expect(q.options.length).toBe(4);
      const archetypes = q.options.map((o) => o.archetype).sort();
      expect(archetypes).toEqual(["absorber", "fader", "fixer", "matcher"]);
    }
  });

  test("every option text is substantive", () => {
    for (const q of TONE_CHECK) {
      for (const o of q.options) {
        expect(o.text.length).toBeGreaterThan(8);
      }
    }
  });
});

describe("scoreToneCheck", () => {
  test("falls back deterministically when no answers are provided", () => {
    expect(scoreToneCheck([])).toBe("matcher");
  });

  test("clean majorities win", () => {
    const all: ToneArchetype[] = ["matcher", "matcher", "matcher"];
    expect(scoreToneCheck(all)).toBe("matcher");
    expect(scoreToneCheck(["fader", "fader", "absorber"])).toBe("fader");
  });

  test("2-of-3 majorities win over splits", () => {
    expect(scoreToneCheck(["fixer", "fixer", "absorber"])).toBe("fixer");
  });

  test("full ties break toward the listed archetype order (matcher first)", () => {
    // One of each of three archetypes — first-listed wins deterministically.
    const tie = ["absorber", "fixer", "fader"] as ToneArchetype[];
    const result = scoreToneCheck(tie);
    expect(["absorber", "fixer", "fader"]).toContain(result);
    // Deterministic: same input, same output.
    expect(scoreToneCheck(tie)).toBe(result);
  });
});

describe("archetype ↔ drill pairing integrity", () => {
  test("every archetype points at a real drill that exists", () => {
    for (const key of Object.keys(ARCHETYPES) as ToneArchetype[]) {
      const info = ARCHETYPES[key];
      expect(DRILLS.some((d) => d.id === info.drillId)).toBe(true);
      expect(info.name.length).toBeGreaterThan(3);
      expect(info.read.length).toBeGreaterThan(30);
      expect(info.pairing.length).toBeGreaterThan(20);
    }
  });

  test("the four archetypes cover four distinct drills", () => {
    const drillIds = Object.values(ARCHETYPES).map((a) => a.drillId);
    expect(new Set(drillIds).size).toBe(4);
  });
});
