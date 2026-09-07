# Architecture — Focus by The Cousin

## System Overview

```
Browser / Mobile
      │
      ▼
 Vercel (Next.js 16 App Router)
  ├── Server Components (default — fetch data server-side)
  ├── Client Components ("use client" — only for interactivity)
  ├── Route Handlers (/api/*) — for webhooks, health checks
  └── Proxy (proxy.ts) — Supabase auth session refresh
      │
      ▼
 Supabase
  ├── PostgreSQL + PostGIS (primary database)
  ├── Auth (planned — not yet implemented)
  └── Storage (planned — for venue/review images)
      │
      ▼
 Future optional services (DO NOT add until explicitly required):
  ├── PostHog (analytics)
  ├── Sentry (monitoring)
  ├── Resend (email)
  └── Cloudflare R2 (media)
```

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16 (App Router) | Server Components by default |
| Language | TypeScript (strict) | |
| Styling | Tailwind CSS v4 | Mobile-first, RTL-aware |
| Database | Supabase PostgreSQL | SQL migrations as source of truth |
| Geospatial | PostGIS | `geography(Point,4326)` on venue_branches |
| Auth | Supabase Auth | Planned — not yet implemented |
| Hosting | Vercel | |
| Font | IBM Plex Sans Arabic | Arabic-first, clean, readable |

## Directory Structure

```
src/
  app/
    layout.tsx          # Root layout — lang="ar", dir="rtl", IBM Plex Arabic
    page.tsx            # Homepage (placeholder)
    robots.ts           # /robots.txt
    sitemap.ts          # /sitemap.xml
    api/health/         # GET /api/health — Supabase connection probe
  proxy.ts              # Supabase auth session refresh (Next.js 16)
  components/           # Reusable UI components
  features/             # Feature-specific modules
  lib/
    supabase/client.ts  # Browser client
    supabase/server.ts  # Server client (SSR)
    db/cities.ts        # City queries
    db/venues.ts        # Venue/branch queries
  types/database.ts     # TypeScript types matching DB schema

supabase/migrations/    # SQL migrations — applied in order
docs/                   # Project documentation
```

## Data Fetching Principles

1. Server Components by default — venue listings, city pages, branch details
2. No useEffect + fetch for public data — use async Server Components
3. Client Components only for interactivity — filters, rating form, map
4. Database access via src/lib/db/ — never query Supabase directly in components

## Security Model

- Publishable key only in NEXT_PUBLIC_* — never service role key
- Service role key → server-side only, SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_ prefix)
- RLS enabled on all tables
- Security headers via next.config.ts

## Planned Routes

```
/                     — Homepage / city selector
/majmaah              — Al-Majmaah venue listing
/riyadh               — Riyadh venue listing
/venue/[slug]         — Individual branch detail
/venue/[slug]/review  — Submit a review (requires auth)
```

## Out of Scope for MVP

Railway, Redis, microservices, Docker, native mobile app, payments,
live crowd tracking, complex recommendation algorithms, custom backend.
