import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * Usage: const signedInUser = await ctx.runQuery(api.authHelpers.currentUser);
 * THIS FUNCTION IS READ-ONLY. DO NOT MODIFY.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (user === null) {
      return null;
    }

    return user;
  },
});

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      throw new Error("Not authenticated");
    }

    await deleteByUser(ctx, "coachNotes", user._id);
    await deleteByUser(ctx, "dailyLog", user._id);
    await deleteByUser(ctx, "drillAttempts", user._id);
    await deleteByUser(ctx, "practiceSessions", user._id);
    await deleteByUser(ctx, "reframeLogs", user._id);

    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .collect();

    for (const session of sessions) {
      const refreshTokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const refreshToken of refreshTokens) {
        await ctx.db.delete(refreshToken._id);
      }

      const verifiers = await ctx.db
        .query("authVerifiers")
        .filter((q) => q.eq(q.field("sessionId"), session._id))
        .collect();
      for (const verifier of verifiers) {
        await ctx.db.delete(verifier._id);
      }

      await ctx.db.delete(session._id);
    }

    const accounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    for (const account of accounts) {
      const verificationCodes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .collect();
      for (const code of verificationCodes) {
        await ctx.db.delete(code._id);
      }

      await ctx.db.delete(account._id);
    }

    await ctx.db.delete(user._id);
  },
});

/**
 * Use this function internally to get the current user data. Remember to handle the null user case.
 * @param ctx
 * @returns
 */
export const getCurrentUser = async (ctx: QueryCtx | MutationCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  return await ctx.db.get(userId);
};

async function deleteByUser(
  ctx: MutationCtx,
  table:
    | "coachNotes"
    | "dailyLog"
    | "drillAttempts"
    | "practiceSessions"
    | "reframeLogs",
  userId: ReturnType<typeof getAuthUserId> extends Promise<infer T> ? Exclude<T, null> : never,
) {
  const docs = await ctx.db
    .query(table)
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}
