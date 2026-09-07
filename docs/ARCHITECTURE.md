# Proposed Architecture

## Guiding principles

- Keep the first release small and easy to change.
- Organize code by product feature while sharing only genuinely reusable code.
- Render public discovery pages on the server where practical.
- Keep provider-specific database and mapping details behind small interfaces.
- Treat Arabic and English as first-class layout directions, even while Arabic ships first.

## Application architecture

The web application uses Next.js App Router, React, strict TypeScript, and Tailwind CSS. Route files
live in `src/app`; feature-specific behavior belongs in `src/features`; shared presentation components
live in `src/components`.

```text
Browser
  → Next.js App Router pages and layouts
    → feature services and queries
      → data-access adapters
        → Supabase PostgreSQL (later)
          → PostGIS geographical queries (later)
```

The current foundation has no database connection. When persistence is introduced, server-side code
should own privileged access and browser code should receive only the data required for its view.

## Source layout

- `src/app`: layouts, pages, loading and error boundaries, and route handlers.
- `src/components`: reusable UI and layout components with no domain data access.
- `src/features`: domain modules such as venue discovery and branch details.
- `src/lib`: configuration, formatting helpers, and external-service adapters.
- `src/types`: types shared across multiple features or application boundaries.
- `src/styles`: shared design tokens and non-route-specific global styling.

As a feature grows, it may contain its own `components`, `queries`, `schemas`, and `types`. Avoid
creating these directories before the feature needs them.

## Proposed routes

The MVP will likely need:

- `/` for discovery and initial area selection.
- `/venues/[slug]` for an individual branch.
- Optional city or area routes if they improve navigation and search indexing.

Only the temporary `/` route exists in this foundation.

## Data model direction

The future data model should distinguish venue brands from physical branches. A branch owns its
address, coordinates, hours, Google Maps URL, focus evaluation, nearby-university distances, and
time-based crowd observations. Scoring definitions should be versioned so displayed ratings remain
explainable when the methodology changes.

No production schema is defined yet. Before implementation, document the source and update policy for
each field, decide which fields may be unknown, and design row-level security alongside access needs.

## Supabase and PostGIS

Supabase PostgreSQL is the proposed persistence layer. PostGIS may later support radius, distance, and
nearest-venue queries. Database access should be introduced through server-only modules, with generated
database types checked into the repository when a schema exists.

Public environment values may use the `NEXT_PUBLIC_` prefix. Service-role keys and other privileged
credentials must never be exposed to client bundles or committed to the repository.

## Localization

- The root document defaults to Arabic and `dir="rtl"`.
- User-facing copy should move into locale dictionaries when English work begins.
- URLs should use stable slugs rather than translated display names where practical.
- Components must support both right-to-left and left-to-right layout without duplicated markup.

An internationalization package should be selected only when requirements such as locale routing and
translation loading are finalized.

## Maps and location

The MVP links to Google Maps for navigation and does not require an embedded map. Links should be
stored or generated from validated branch coordinates. A map provider SDK should not be added until a
specific interactive-map requirement justifies it.

## Quality and delivery

- ESLint enforces Next.js and TypeScript rules.
- Prettier provides deterministic formatting.
- `tsc --noEmit` verifies strict types.
- `next build` verifies a production compilation.
- Pull requests should run these checks before review and deployment.

Automated tests should be added with the first meaningful business rules. Prefer unit tests for score
calculation and integration tests for important discovery journeys; avoid installing a test framework
before testable behavior exists.

## Security and privacy

- Commit only environment-variable names, never values.
- Keep privileged data access on the server.
- Validate all future request input at application boundaries.
- Add rate limiting and abuse controls when write endpoints are introduced.
- Collect the minimum location and analytics data needed for the product.

## Deferred decisions

- Final database schema, row-level security policies, and migrations.
- Authentication and user accounts.
- A places or opening-hours data provider.
- Analytics, monitoring, and deployment platform.
- Caching and revalidation rules for production data.
