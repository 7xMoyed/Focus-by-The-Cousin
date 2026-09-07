# Focus by The Cousin

Focus by The Cousin is an Arabic-first web product that helps students and remote workers find
places that are genuinely suitable for studying and focused work. Each branch is evaluated as an
individual location rather than treated as another entry in a generic café directory.

The initial launch area covers Al Majma’ah and a limited part of Riyadh, especially the area around
King Saud University and northern Riyadh.

## Current status

This repository contains the safe project foundation only: a Next.js App Router application, a
temporary responsive homepage, shared styling, strict TypeScript, linting and formatting, and MVP
documentation. Database integration, authentication, payments, and subscriptions are intentionally
out of scope at this stage.

## Requirements

- Node.js 20.9 or later
- npm 10 or later

## Local setup

1. Clone the repository and enter its directory.
2. Copy `.env.example` to `.env.local`.
3. Leave the Supabase variables empty until a Supabase project is introduced.
4. Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run format:check
npm run build
```

## Project structure

```text
src/
├── app/          # App Router layouts, pages, and route-level styles
├── components/   # Shared presentation components
├── features/     # Product features grouped by domain
├── lib/          # Framework-independent constants and utilities
├── styles/       # Shared design tokens
└── types/        # Shared TypeScript types
```

See [the product specification](docs/PRODUCT_SPEC.md), [the architecture notes](docs/ARCHITECTURE.md),
and [the contribution guide](docs/CONTRIBUTING.md) for more detail.

## Environment variables

`.env.example` documents supported variable names without credentials. Never commit `.env.local` or
real keys. Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser and must never contain
private secrets.
