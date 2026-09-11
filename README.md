# HealthGeek.ai

AI-powered personal healthcare platform combining daily health tracking, intelligent analysis, and personalized recommendations.

Runs entirely on your machine. There is no cloud project to create, no SDK tied to a
particular vendor, and no API key required to start.

## Quick Start

```bash
npm install
npm run dev          # http://localhost:9002
```

Then open http://localhost:9002, create an account, and use the app. Data is written
to `./.data/healthgeek.json`.

With no configuration, the AI features return clearly-labelled sample data
(`AI_PROVIDER=mock`), so every screen is usable offline. To get real analysis, point the
app at a model — see [AI providers](#ai-providers).

## Architecture

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| AI | Pluggable provider: local models, OpenAI-compatible APIs, Anthropic, or Gemini |
| Database | JSON document store on local disk (`.data/healthgeek.json`) |
| Auth | Email/password, scrypt-hashed, HMAC-signed session cookie |
| UI | shadcn/ui (Radix + Tailwind CSS) |
| Deployment | Any Node 22 host, or the included Dockerfile |

Nothing in the app talks to a vendor SDK. The two replaceable seams are:

- **`src/lib/server/store.ts`** — the document store. The browser never reaches it
  directly; it goes through `POST /api/db`, which authenticates the session cookie and
  applies the ownership rules in `src/lib/server/access.ts`.
- **`src/ai/providers/`** — one small adapter per model vendor, each built on `fetch`.
  `src/ai/core.ts` renders prompts and validates responses against the flow's Zod schema,
  so the rest of the app is unaware of which provider is configured.

## AI providers

Set `AI_PROVIDER` in `.env.local`:

| `AI_PROVIDER` | What it calls | Needs a key |
|---|---|---|
| `mock` (default) | nothing — returns placeholder data | no |
| `ollama` | a local Ollama daemon | no |
| `openai` | OpenAI, or anything speaking the OpenAI chat-completions protocol | yes |
| `anthropic` | the Anthropic Messages API | yes |
| `gemini` | the Google Generative Language API | yes |

Fully local setup with Ollama:

```bash
ollama pull llama3.2          # or a vision model such as llava for photo analysis
echo "AI_PROVIDER=ollama" >> .env.local
npm run dev
```

Point `AI_BASE_URL` at LM Studio, vLLM, llama.cpp, or a gateway like LiteLLM to use those
instead — they all speak the same protocol as the `openai` provider.

Two notes on local models: photo and report analysis need a **vision-capable** model, and
the posture analyzer sends video, which only the `gemini` provider accepts. Providers that
cannot read an attachment say so in the prompt rather than pretending they saw it.

## Configuration

Copy `.env.example` to `.env.local`. Every value has a working default.

| Variable | Purpose |
|---|---|
| `AUTH_SECRET` | Signs session cookies. Optional — a random one is generated and stored at `$HEALTHGEEK_DATA_DIR/auth-secret` if unset. Set it if you run more than one instance. |
| `HEALTHGEEK_DATA_DIR` | Where `healthgeek.json` lives (default `./.data`). |
| `AI_PROVIDER` | Which model adapter to use (default `mock`). |
| `AI_MODEL` | Model name; each provider has a sensible default. |
| `AI_API_KEY` | Credential for the chosen provider. |
| `AI_BASE_URL` | Override the provider endpoint. |
| `AI_MAX_TOKENS` | Response cap for the `anthropic` provider. |

## Running in a container

```bash
export AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
docker compose up --build       # http://localhost:9002
```

The document store is kept in a named volume, so accounts and logs survive restarts.

## Features

- **AI Food Tracking** — Photo-based calorie estimation with health impact analysis
- **Workout & Meditation Logging** — Manual tracking with history and search
- **Health Report Analysis** — Upload lab reports, AI extracts metrics and suggests profile updates
- **Posture Analysis** — Video-based posture assessment with corrective recommendations
- **Personalized Recommendations** — AI-generated recipes, workouts, meditations, and habits tailored to your health profile
- **Health Quizzes** — AI-generated educational quizzes on health topics
- **PDF Reports** — Exportable reports with date range filtering

## Data and privacy

Everything stays on the machine running the app: accounts, health logs, uploaded reports.
The only outbound traffic is to the model provider you configure, and with `AI_PROVIDER=mock`
there is none at all.

`.data/` is gitignored. To reset the app completely, delete it.

## Documentation

| Section | Description |
|---------|-------------|
| [docs/architecture/](./docs/architecture/) | System diagrams, data models, deployment topology |
| [docs/design/](./docs/design/) | Design system, user journeys, layout patterns |
| [docs/code/](./docs/code/) | AI flow reference, data access patterns, conventions |
| [docs/testing/](./docs/testing/) | Test strategy, test plans, security testing |
| [docs/presentation/](./docs/presentation/) | Product overview, demo script, roadmap |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (port 9002, Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript checking |
