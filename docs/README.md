# HealthGeek Documentation

Comprehensive documentation for **HealthGeek.ai** — an AI-powered personal healthcare platform.

## Documentation Index

| Directory | Description |
|-----------|-------------|
| [architecture/](./architecture/) | System architecture, data flows, infrastructure diagrams |
| [design/](./design/) | UI/UX design system, user journeys, wireframes |
| [code/](./code/) | Code organization, AI flows, API reference, conventions |
| [testing/](./testing/) | Testing strategy, test plans, quality assurance |
| [presentation/](./presentation/) | Product overview, pitch deck content, demo scripts |

## Quick Links

- **Run locally**: `npm run dev` (port 9002)
- **AI dev server**: `npm run genkit:dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Type check**: `npm run typecheck`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript, React 18 |
| AI Engine | Google Genkit + Gemini 2.0 Flash |
| Database | Cloud Firestore (NoSQL) |
| Authentication | Firebase Auth (email/password) |
| UI Components | shadcn/ui (Radix + Tailwind CSS) |
| Forms | React Hook Form + Zod validation |
| PDF Generation | jsPDF + jspdf-autotable |
| Deployment | Firebase App Hosting |
