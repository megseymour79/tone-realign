# ShiftedTone — Launch Checklist

> **Do not launch until §0 is complete.**

## Done in code

- Branded metadata, Open Graph/Twitter cards, canonical URL, theme colors, favicon, PWA icons, manifest, `robots.txt`, and `sitemap.xml`.
- Plausible SPA pageviews and funnel events are wired with a safe no-op when unconfigured.
- Production error UX, global error reporting, focus rings, reduced-motion support, and anchored-section scroll margins are implemented.
- Convex queries and mutations enforce authenticated `userId` row-level isolation.
- `.env.keys` is comments-only; `.env.local`, archives, and build output are ignored. No secrets belong in tracked files.
- Ops tooling (`/push-source`, `src/convex/githubPush.ts`, `/source-zip`, `_sourceSnapshot.ts`) is **not present** in this repository.
- Verification: `bun tsc -b --noEmit`, `bun test`, `bun run build`, `bun scripts/validate-og.ts`, and `bun run test:ct`.

## 0. Secret rotation — required hard blocker

A dotenvx private key was previously committed in `.env.keys`. Treat it as compromised.

1. **Rotate/revoke the old key first.** Rotation is the real fix; history purge only limits further exposure.
   - Regenerate the dotenvx private key or delete any `.env` files that used it.
   - Rotate any secrets it protected in the deployment secrets manager, Convex dashboard, or Vercel Environment Variables.
   - Confirm the old key no longer decrypts anything.
2. **Purge `.env.keys` from all Git history** using `git-filter-repo` or BFG, then force-push all branches and tags after coordinating with collaborators.
3. Ask GitHub Support to clear cached unreachable commits; have collaborators re-clone; never print the old value.
4. Verify the purge and ensure replacement keys exist only in the secrets manager.

## 1. Production environment variables

Set these only in the deployment secrets manager:

- `VITE_CONVEX_URL` — production Convex URL
- `VITE_PLAUSIBLE_DOMAIN` and optional `VITE_PLAUSIBLE_API_HOST`
- `VLY_INTEGRATION_KEY`
- `JWKS`, `JWT_PRIVATE_KEY`
- `SITE_URL`, `CONVEX_SITE_URL`

## 2. Hosting, domain, and analytics

Choose one hosting target: Vercel (`vercel.json`) or Deno Deploy (`main.ts`). Deploy Convex production, configure `shiftedtone.com` and `www.shiftedtone.com`, configure DNS/TLS, create the Plausible site, set environment variables, and redeploy.

## 3. Pre-launch smoke test

- [ ] Secret rotation and history purge complete.
- [ ] Sign up, use a drill, save, and confirm progress.
- [ ] Sign-out redirects `/dashboard` to `/auth?returnTo=/dashboard`.
- [ ] Sign back in and confirm return to the dashboard.
- [ ] Mic denial shows an inline error without crashing.
- [ ] Offline/throttled requests show failure without silent data loss.
- [ ] User A cannot read or write User B's sessions, logs, or notes.
- [ ] Convex CORS is restricted to the production origin.
- [ ] `VITE_CONVEX_URL` is the production URL.
- [ ] No secrets remain in Git history or tracked files.
- [ ] Remove/disable `/push-source`, `src/convex/githubPush.ts`, `/source-zip`, and `src/convex/_sourceSnapshot.ts` before launch.
- [ ] Lighthouse mobile score is at least 90 on `/`.
- [ ] OG preview renders correctly in a messaging app.
