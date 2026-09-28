import { describe, expect, test } from "bun:test";
import type { Id } from "./_generated/dataModel";
import { deleteAccountData, deleteCurrentAccount } from "./users";

type TableName =
  | "users"
  | "coachNotes"
  | "dailyLog"
  | "drillAttempts"
  | "practiceSessions"
  | "reframeLogs"
  | "authSessions"
  | "authRefreshTokens"
  | "authAccounts"
  | "authVerificationCodes";

type Doc = { _id: string; [key: string]: unknown };
type Store = Record<TableName, Doc[]>;

function makeCtx(store: Store) {
  const db = {
    query(table: TableName) {
      return {
        withIndex(
          _indexName: string,
          selector: (q: {
            eq: (field: string, value: unknown) => {
              eq: (nextField: string, nextValue: unknown) => { values: Record<string, unknown> };
              values: Record<string, unknown>;
            };
          }) => { values: Record<string, unknown> },
        ) {
          const selected = selector({
            eq(field, value) {
              const values: Record<string, unknown> = { [field]: value };
              return {
                values,
                eq(nextField, nextValue) {
                  values[nextField] = nextValue;
                  return { values };
                },
              };
            },
          }).values;
          const matches = () =>
            store[table].filter((doc) =>
              Object.entries(selected).every(([field, value]) => doc[field] === value),
            );
          return {
            collect: async () => matches(),
            unique: async () => matches()[0] ?? null,
          };
        },
      };
    },
    async delete(id: string) {
      for (const docs of Object.values(store)) {
        const index = docs.findIndex((doc) => doc._id === id);
        if (index >= 0) {
          docs.splice(index, 1);
          return;
        }
      }
    },
  };

  return { db };
}

describe("deleteCurrentAccount", () => {
  test("rejects unauthenticated callers", async () => {
    const ctx = makeCtx({
      users: [],
      coachNotes: [],
      dailyLog: [],
      drillAttempts: [],
      practiceSessions: [],
      reframeLogs: [],
      authSessions: [],
      authRefreshTokens: [],
      authAccounts: [],
      authVerificationCodes: [],
    });

    await expect(
      deleteCurrentAccount(ctx as never, async () => null),
    ).rejects.toThrow("Not authenticated");
  });
});

describe("deleteAccountData", () => {
  test("removes the user's app and auth records without touching other users", async () => {
    const userId = "user_1" as Id<"users">;
    const otherUserId = "user_2" as Id<"users">;
    const emailAccountId = "account_email";
    const anonAccountId = "account_anon";
    const otherAccountId = "account_other";
    const sessionId = "session_1";
    const otherSessionId = "session_2";

    const store: Store = {
      users: [{ _id: userId }, { _id: otherUserId }],
      coachNotes: [
        { _id: "note_1", userId },
        { _id: "note_2", userId: otherUserId },
      ],
      dailyLog: [
        { _id: "day_1", userId },
        { _id: "day_2", userId: otherUserId },
      ],
      drillAttempts: [
        { _id: "drill_1", userId },
        { _id: "drill_2", userId: otherUserId },
      ],
      practiceSessions: [
        { _id: "practice_1", userId },
        { _id: "practice_2", userId: otherUserId },
      ],
      reframeLogs: [
        { _id: "reframe_1", userId },
        { _id: "reframe_2", userId: otherUserId },
      ],
      authSessions: [
        { _id: sessionId, userId },
        { _id: otherSessionId, userId: otherUserId },
      ],
      authRefreshTokens: [
        { _id: "refresh_1", sessionId },
        { _id: "refresh_2", sessionId: otherSessionId },
      ],
      authAccounts: [
        { _id: emailAccountId, userId, provider: "email-otp" },
        { _id: anonAccountId, userId, provider: "anonymous" },
        { _id: otherAccountId, userId: otherUserId, provider: "email-otp" },
      ],
      authVerificationCodes: [
        { _id: "code_1", accountId: emailAccountId },
        { _id: "code_2", accountId: anonAccountId },
        { _id: "code_3", accountId: otherAccountId },
      ],
    };

    await deleteAccountData(makeCtx(store) as never, userId);

    expect(store.users.map((doc) => doc._id)).toEqual([otherUserId]);
    expect(store.coachNotes.map((doc) => doc._id)).toEqual(["note_2"]);
    expect(store.dailyLog.map((doc) => doc._id)).toEqual(["day_2"]);
    expect(store.drillAttempts.map((doc) => doc._id)).toEqual(["drill_2"]);
    expect(store.practiceSessions.map((doc) => doc._id)).toEqual(["practice_2"]);
    expect(store.reframeLogs.map((doc) => doc._id)).toEqual(["reframe_2"]);
    expect(store.authSessions.map((doc) => doc._id)).toEqual([otherSessionId]);
    expect(store.authRefreshTokens.map((doc) => doc._id)).toEqual(["refresh_2"]);
    expect(store.authAccounts.map((doc) => doc._id)).toEqual([otherAccountId]);
    expect(store.authVerificationCodes.map((doc) => doc._id)).toEqual(["code_3"]);
  });
});
