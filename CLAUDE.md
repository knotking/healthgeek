# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start dev server on port 9002 (uses Turbopack)
- `npm run build` — Production build
- `npm run lint` — Run ESLint
- `npm run typecheck` — TypeScript type checking
- `npm run genkit:dev` — Start Genkit AI dev server
- `npm run genkit:watch` — Start Genkit with file watching

## Architecture

**HealthGeek** is a Next.js 15 health tracking app deployed on Firebase App Hosting with Firestore as the database.

### Key layers

- **`src/app/`** — Next.js App Router pages. All dashboard routes are under `src/app/dashboard/` and protected by auth in `dashboard/layout.tsx`.
- **`src/ai/`** — Genkit AI flows using Google AI (Gemini 2.0 Flash). Each file in `src/ai/flows/` is a standalone AI feature (food analysis, workout recommendations, meditation, posture analysis, health reports, etc.).
- **`src/lib/firebase.ts`** — Firebase client setup (Auth + Firestore). Config comes from `NEXT_PUBLIC_FIREBASE_*` env vars.
- **`src/components/ui/`** — shadcn/ui component library (Radix primitives + Tailwind).
- **`src/hooks/`** — Shared React hooks.

### Dashboard sections

Insights, Analysis, Tracking, Recommendations, Health Quiz, Reports, Provider, Marketplace — each a route under `/dashboard/`.

### Data model

User profiles stored in Firestore `profiles/{uid}` collection with fields: name, age, height, weight, bmi, healthIssues, diets, dailyCalorieTarget.

### Deployment

Firebase App Hosting (`apphosting.yaml`). Firestore rules in `firestore.rules`, indexes in `firestore.indexes.json`.

### Notable choices

- TypeScript and ESLint errors are ignored during build (`next.config.ts`) — the codebase prioritizes iteration speed.
- UI uses shadcn/ui components with `components.json` for configuration.
- Path alias `@/` maps to `src/`.
