# Sysnova AI MVP

Startup-grade MVP foundation for Sysnova AI built with:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Reusable UI components
- Premium dark SaaS design system

## Quick Start

```bash
npm install
npm run dev
```

## Database Setup (PostgreSQL)

Sysnova now supports a DB-backed persistence layer (Prisma + PostgreSQL) for chats and settings.

1) Configure environment variables:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sysnova_ai?schema=public"
SYSNOVA_DEFAULT_USER_EMAIL="owner@sysnova.ai"
SYSNOVA_LLM_PROVIDER="gemini"
SYSNOVA_LLM_SECONDARY_PROVIDER="groq"
GEMINI_API_KEY=""
GROQ_API_KEY=""
GROQ_MODEL="llama-3.1-8b-instant"
OPENROUTER_API_KEY=""
OPENROUTER_MODEL="stepfun/step-3.5-flash:free"
```

2) Push schema and generate client:

```bash
npm run db:push
npm run db:generate
```

If `DATABASE_URL` is not set, APIs automatically use the legacy JSON file storage in `data/`.

## Auth Session Setup

When `DATABASE_URL` is configured, Sysnova enables real auth sessions:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`

Dashboard pages and private APIs are protected with session checks.

## Free AI Fallback Option

If Gemini free-tier quota is reached, you can use Groq as secondary provider:

```bash
SYSNOVA_LLM_PROVIDER="gemini"
SYSNOVA_LLM_SECONDARY_PROVIDER="groq"
GROQ_API_KEY="your_groq_key"
GROQ_MODEL="llama-3.1-8b-instant"
```

Or set Groq as primary:

```bash
SYSNOVA_LLM_PROVIDER="groq"
GROQ_API_KEY="your_groq_key"
```

You can also use OpenRouter (for example StepFun free model):

```bash
SYSNOVA_LLM_PROVIDER="openrouter"
OPENROUTER_API_KEY="your_openrouter_key"
OPENROUTER_MODEL="stepfun/step-3.5-flash:free"
```

## Current Scope

- Premium landing page (`/`)
- Dashboard shell with sidebar and topbar (`/dashboard`)
- AI workspace 3-column chat experience (`/dashboard/workspace`)
- Placeholder pages for remaining core modules

## Structure

```text
app/
  page.tsx
  layout.tsx
  globals.css
  dashboard/
    layout.tsx
    page.tsx
    workspace/page.tsx
    knowledge/page.tsx
    products/page.tsx
    marketing/page.tsx
    api/page.tsx
    tunisian-ai/page.tsx
    settings/page.tsx
components/
  landing/
  layout/
  dashboard/
  workspace/
  ui/
lib/
  mock-data.ts
  utils.ts
```
