# ShiftedTone — Launch Checklist

> **Do not launch until §0 is complete.**

## Done in code

- Branded metadata, Open Graph/Twitter cards, canonical URL, theme colors, favicon, PWA icons, manifest, `robots.txt`, and `sitemap.xml`.
- Plausible SPA pageviews and funnel events are wired with a safe no-op when unconfigured.
- Production error UX, global error reporting, focus rings, reduced-motion support, and anchored-section scroll margins are implemented.
- Convex queries and mutations enforce authenticated `userId` row-level isolation.
- `.env.keys` is comments-only; `.env.local`, archives, and build output are ignored. No secrets belong in tracked files.
- Verification: `bun tsc -b --noEmit`, `bun test`, `bun run build`, `bun scripts/validate-og.ts`, and `bun run test:ct`.

## 0. Secret rotation — required hard blocker

A dotenvx private key was previously committed in `.env.keys`. Treat it as compromised.

1. Rotate/revoke the old key first. Rotate any secrets it protected in the secrets manager, Convex dashboard, or Vercel settings. Never commit replacement secrets.
2. Purge `.env.keys` from all Git history using `git-filter-repo` or BFG, then force-push all branches and tags after coordinating with collaborators.
3. Ask GitHub Support to clear cached unreachable commits and have collaborators re-clone. Do not print the old value anywhere.
4. Verify the old key no longer decrypts anything and that replacement keys exist only in the secrets manager.

## 1. Production environment

Set these only in the deployment secrets manager:

- `VITE_CONVEX_URL` — production Convex URL
- `VITE_PLAUSIBLE_DOMAIN` — optional Plausible domain
- `VITE_PLAUSIBLE_API_HOST` — optional self-hosted/proxy host
- `VLY_INTEGRATION_KEY`
- `JWKS`, `JWT_PRIVATE_KEY`
- `SITE_URL`, `CONVEX_SITE_URL`

## 2. Choose one hosting target

Choose either Vercel (`vercel.json`) or Deno Deploy (`main.ts`), not both. Deploy the production Convex backend and point `VITE_CONVEX_URL` to it. Run all smoke tests against the selected host.

## 3. Domain and analytics

Configure `shiftedtone.com` and `www.shiftedtone.com` at the selected host and registrar. Create a Plausible site for `shiftedtone.com`, set `VITE_PLAUSIBLE_DOMAIN`, and redeploy.

## 4. Pre-launch smoke test

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
