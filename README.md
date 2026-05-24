# HealthGeek.ai

AI-powered personal healthcare platform combining daily health tracking, intelligent analysis, and personalized recommendations.

## Quick Start

```bash
npm install
npm run dev          # Start dev server on port 9002
npm run genkit:dev   # Start AI dev server
```

## Features

- **AI Food Tracking** — Photo-based calorie estimation with health impact analysis
- **Workout & Meditation Logging** — Manual tracking with history and search
- **Health Report Analysis** — Upload lab reports, AI extracts metrics and suggests profile updates
- **Posture Analysis** — Video-based posture assessment with corrective recommendations
- **Personalized Recommendations** — AI-generated recipes, workouts, meditations, and habits tailored to your health profile
- **Health Quizzes** — AI-generated educational quizzes on health topics
- **PDF Reports** — Exportable reports with date range filtering

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| AI Engine | Google Genkit + Gemini 2.0 Flash |
| Database | Cloud Firestore |
| Auth | Firebase Authentication |
| UI | shadcn/ui (Radix + Tailwind CSS) |
| Deployment | Firebase App Hosting |

## Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

| Section | Description |
|---------|-------------|
| [docs/architecture/](./docs/architecture/) | System diagrams, data models, deployment topology |
| [docs/design/](./docs/design/) | Design system, user journeys, layout patterns |
| [docs/code/](./docs/code/) | AI flow reference, data access patterns, conventions |
| [docs/testing/](./docs/testing/) | Test strategy, test plans, security testing |
| [docs/presentation/](./docs/presentation/) | Product overview, demo script, roadmap |

## Environment Variables

Create a `.env.local` file with:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
GOOGLE_API_KEY=
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (port 9002, Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript checking |
| `npm run genkit:dev` | Genkit AI dev server |
| `npm run genkit:watch` | Genkit with file watching |
