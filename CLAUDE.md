# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start dev server on port 9002 (uses Turbopack)
- `npm run build` — Production build
- `npm start` — Serve the production build
- `npm run lint` — Run ESLint
- `npm run typecheck` — TypeScript type checking

## Architecture

**HealthGeek** is a Next.js 15 health tracking app that runs entirely locally. It has no
cloud-provider dependency: data lives in a JSON file on disk, auth is a signed cookie, and
the AI layer is a set of small adapters chosen by environment variable.

### Key layers

- **`src/app/`** — Next.js App Router pages. All dashboard routes are under `src/app/dashboard/` and protected by auth in `dashboard/layout.tsx`.
- **`src/app/api/db/route.ts`** — the only data endpoint. Authenticates the session cookie, applies the ownership rules, then calls the store.
- **`src/app/api/auth/*`** — signup, login, logout, and session lookup.
- **`src/lib/server/store.ts`** — JSON document store (`.data/healthgeek.json`) with the query engine. Server-only.
- **`src/lib/server/access.ts`** — ownership rules: `profiles/{uid}` is readable only by that uid, and every other collection is filtered to `userId == session.uid`.
- **`src/lib/server/auth.ts`** — scrypt password hashing and HMAC-signed session cookies. The signing key comes from `AUTH_SECRET`, or is generated once into `<data dir>/auth-secret`.
- **`src/lib/data/client.ts`** — the client-side data API (`collection`, `doc`, `query`, `where`, `getDocs`, `setDoc`, …) used by pages. Every call is a request to `/api/db`.
- **`src/lib/auth/client.ts`** — the client-side auth API (`useAuthState`, `onAuthStateChanged`, `signInWithEmailAndPassword`, …).
- **`src/ai/core.ts`** — `ai.definePrompt` / `ai.defineFlow`: renders the prompt template, calls the provider, validates the result against the flow's Zod schema (with one repair retry).
- **`src/ai/providers/`** — one adapter per vendor (`mock`, `openai-compatible`, `anthropic`, `gemini`), all plain `fetch`. Selected by `AI_PROVIDER`.
- **`src/ai/template.ts`** — the Handlebars subset the prompts use: `{{{var}}}`, `{{#if}}`, `{{#unless}}`, `{{#each}}` with `@last`, and `{{media url=…}}`.
- **`src/ai/flows/`** — one standalone AI feature per file (food analysis, workout recommendations, meditation, posture analysis, health reports, etc.), each a `'use server'` module.
- **`src/components/ui/`** — shadcn/ui component library (Radix primitives + Tailwind).
- **`src/hooks/`** — Shared React hooks.

### Dashboard sections

Insights, Analysis, Tracking, Recommendations, Health Quiz, Reports, Provider, Marketplace — each a route under `/dashboard/`.

### Data model

Documents are stored in `.data/healthgeek.json` under named collections:

- `profiles/{uid}` — name, age, height, weight, bmi, healthIssues, diets, dailyCalorieTarget
- `food-log`, `workout-log`, `meditation-log`, `health-reports`, `saved-quizzes`, `recommendation-history` — each document carries a `userId`

Timestamps are tagged on the wire (see `src/lib/data/wire.ts`) so `doc.data().timestamp.toDate()`
works on the client, and `serverTimestamp()` is resolved on the server.

### Adding a collection

Add it to `OWNED_COLLECTIONS` in `src/lib/server/access.ts`, or the API route will reject it.

### Deployment

Any Node 22 host. `next.config.ts` sets `output: 'standalone'`; the included `Dockerfile`
and `docker-compose.yml` build that into an image with the data directory on a volume.

### Notable choices

- TypeScript and ESLint errors are ignored during build (`next.config.ts`) — the codebase prioritizes iteration speed. `npm run typecheck` is clean from a cold `.next`; keep it that way.
- Two files are empty stubs left over from unfinished features: `src/app/dashboard/food-assessment/page.tsx` and `src/ai/flows/food-assessor.ts`. The empty page makes `tsc` complain once `.next/types` has been generated (`is not a module`), and `/dashboard/food-assessment` renders nothing.
- `npm run lint` has never been configured — it drops into ESLint's interactive setup prompt.
- `AI_PROVIDER` defaults to `mock`, which returns obviously-labelled sample data so the app is fully clickable with no model configured.
- UI uses shadcn/ui components with `components.json` for configuration.
- Path alias `@/` maps to `src/`.
