import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // Paid add-on: the metrics-anchored post-take coach. Set by the
      // entitlements module after checkout (see convex/entitlements.ts).
      coachUnlocked: v.optional(v.boolean()),

      // Lifetime Read-the-Room scenarios answered (drives achievements).
      quizCount: v.optional(v.number()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // One completed tone practice take (microphone session)
    practiceSessions: defineTable({
      userId: v.id("users"),
      drill: v.string(), // e.g. "steady-ground" | "warm-open" | "firm-clear"
      scenario: v.optional(v.string()), // free-text context the user typed
      durationMs: v.number(),
      // Aggregate scores 0..100 from the client-side audio analysis
      calmScore: v.number(),
      energyScore: v.number(),
      clarityScore: v.number(),
      stabilityScore: v.number(),
      overallScore: v.number(),
      // Raw metrics
      avgPitchHz: v.number(),
      pitchRangeHz: v.number(),
      avgVolume: v.number(),
      volumeVariability: v.number(),
      wordsPerMinute: v.number(),
      voicedRatio: v.number(),
      dominantTone: v.string(), // "calm" | "energetic" | "tense" | "flat" | "mixed"
      // Live speech-to-text of the take when the browser supports it
      transcript: v.optional(v.string()),
    }).index("by_user", ["userId"]),

    // A triggered-response reframe exercise
    reframeLogs: defineTable({
      userId: v.id("users"),
      trigger: v.string(), // the situation / other person's words
      reaction: v.string(), // the user's automatic response
      goal: v.optional(v.string()), // desired outcome, e.g. "stay calm"
      reframe: v.optional(v.string()), // AI-coached alternative response
      toneNote: v.optional(v.string()), // how to say it
    }).index("by_user", ["userId"]),

    // Which drills the user has practiced and how many times
    drillAttempts: defineTable({
      userId: v.id("users"),
      drill: v.string(),
      bestScore: v.number(),
      attemptCount: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_drill", ["userId", "drill"]),

    // One AI coach note per saved take — anchored to that take's numbers.
    coachNotes: defineTable({
      userId: v.id("users"),
      sessionId: v.id("practiceSessions"),
      feedback: v.string(), // 2-3 sentences citing their real numbers
      oneThing: v.optional(v.string()), // the single move for the next take
      source: v.string(), // "llm" | "fallback"
    })
      .index("by_session", ["sessionId"])
      .index("by_user", ["userId"]),

    // One row per user per local day: the daily checklist + XP awards.
    // Keyed by "YYYY-M-D" in the user's local time so midnight is *their* midnight.
    dailyLog: defineTable({
      userId: v.id("users"),
      day: v.string(),
      completed: v.array(v.string()), // DailyActionId values already done today
      xpEarned: v.number(), // XP awarded today (base actions + bonuses)
    })
      .index("by_user", ["userId"])
      .index("by_user_day", ["userId", "day"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
