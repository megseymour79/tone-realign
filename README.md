## Overview

This project uses the following tech stack:
- Vite
- TypeScript
- React Router v7 (all imports from `react-router`)
- React 19
- Tailwind v4
- shadcn/ui
- Lucide Icons
- Convex
- Convex Auth
- Framer Motion

All relevant application files live in `src`.

## Setup

Install dependencies with npm:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

## Environment variables

Copy `.env.example` to `.env.local` for local development and provide real values through your hosting provider for production.

Key variables:
- `VITE_CONVEX_URL`
- `CONVEX_DEPLOYMENT`
- `SITE_URL`
- `CONVEX_SITE_URL`
- `JWKS`
- `JWT_PRIVATE_KEY`
- `DOTENV_PRIVATE_KEY_LOCAL`
- `VLY_EMAIL_API_KEY`
- `VITE_PLAUSIBLE_DOMAIN`
- `VITE_PLAUSIBLE_API_HOST`

## Launch notes

- Review `./LAUNCH_CHECKLIST.md` before production deployment.
- Keep `.env.keys` comments-only and never commit secrets.
