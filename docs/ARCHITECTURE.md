# Architecture — Focus by The Cousin

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) — to be connected |
| Maps | Google Maps URLs (directions only, initially) |
| Hosting | TBD |

## Directory Structure

```
src/
  app/           # Next.js App Router pages and layouts
  components/    # Reusable UI components
  features/      # Feature-specific modules (places, reviews, etc.)
  lib/           # Utilities, Supabase client, helpers
  types/         # TypeScript type definitions
  styles/        # Global styles
docs/            # Project documentation
```

## Design Principles
- Mobile-first responsive design
- Arabic RTL support
- Clean, scalable architecture
- Server components by default, client components when needed

## Data Flow (planned)
1. Supabase PostgreSQL stores places and reviews
2. Next.js Server Components fetch data server-side
3. Client Components handle interactive UI (filters, maps)

## Key Decisions
See `DECISIONS.md` for architectural decisions and rationale.
