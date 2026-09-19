/* eslint-disable */
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as coach from "../coach.js";
import type * as coachNotes from "../coachNotes.js";
import type * as dailyLog from "../dailyLog.js";
import type * as http from "../http.js";
import type * as reframes from "../reframes.js";
import type * as sessions from "../sessions.js";
import type * as users from "../users.js";

import type {
ApiFromModules,
FilterApi,
FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
ai: typeof ai;
auth: typeof auth;
"auth/emailOtp": typeof auth_emailOtp;
coach: typeof coach;
coachNotes: typeof coachNotes;
dailyLog: typeof dailyLog;
http: typeof http;
reframes: typeof reframes;
sessions: typeof sessions;
users: typeof users;
}>;

export declare const api: FilterApi<
typeof fullApi,
FunctionReference<any, "public">
>;

export declare const internal: FilterApi<
typeof fullApi,
FunctionReference<any, "internal">
>;

export declare const components: {};