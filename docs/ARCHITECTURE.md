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
        → Supabase PostgreSQL
          → PostGIS geographical queries (later)
```

The application has a Supabase client configured with a project URL and publishable key. The
`/api/venues` route queries published branches and returns only public fields. Authentication uses
Supabase Auth, while profile and discovery-session reads and writes are restricted by database RLS.
No service-role key is exposed to the application.

## Source layout

- `src/app`: layouts, pages, loading and error boundaries, and route handlers.
- `src/components`: reusable UI and layout components with no domain data access.
- `src/features`: domain modules such as venue discovery and branch details.
- `src/lib`: configuration, deterministic recommendation logic, formatting helpers, and
  external-service adapters.
- `src/types`: types shared across multiple features or application boundaries.
- `src/styles`: shared design tokens and non-route-specific global styling.

As a feature grows, it may contain its own `components`, `queries`, `schemas`, and `types`. Avoid
creating these directories before the feature needs them.

## Proposed routes

The MVP will likely need:

- `/` for the landing page and discovery entry point.
- `/find` for the six-step discovery flow and its sign-up/login gate.
- `/results` for authenticated session results.
- `/venues/[slug]` for an individual branch.
- Optional city or area routes if they improve navigation and search indexing.

## Data model direction

The future data model should distinguish venue brands from physical branches. A branch owns its
address, coordinates, hours, Google Maps URL, focus evaluation, nearby-university distances, and
time-based crowd observations. Scoring definitions should be versioned so displayed ratings remain
explainable when the methodology changes.

The connected project currently has venue data tables plus `profiles` and `discovery_sessions`.
Application tables have row-level security enabled. The public branch query never requests reviewer
identity, while authenticated data policies restrict profiles and discovery sessions to their owner.
Schema changes are captured as additive SQL migrations.

Long-term Focus Profile preferences and `onboarding_completed_at` live on the existing `profiles`
row. Temporary discovery answers remain in `discovery_sessions`; applying filters never silently
overwrites the Focus Profile.

## Recommendation logic

- `src/lib/recommendations/focus-score.ts` calculates non-personalized branch quality from approved
  aggregate review dimensions and enforces a minimum-data threshold.
- `src/lib/recommendations/matching.ts` calculates personalized compatibility only when filters are
  active. It uses deterministic session and priority weights and never calls an AI model.
- `src/lib/recommendations/venue-ranking.ts` sorts filtered results by Match %, while default
  browsing uses confidence-adjusted Focus Score without labeling it as a match.
- Match explanations are assembled only from structured dimensions that meet the quality threshold.

## Supabase and PostGIS

Supabase PostgreSQL is the persistence layer. The current client uses only the publishable key;
row-level security limits public reads to published branches and approved reviews. PostGIS is
installed in the connected project, but radius, distance, and nearest-venue queries are not yet
implemented. Privileged database access should be introduced through server-only modules, with
generated database types checked into the repository after the schema is stabilized.

Public environment values may use the `NEXT_PUBLIC_` prefix. Service-role keys and other privileged
credentials must never be exposed to client bundles or committed to the repository.

### Founder venue review

`/founder` is a private operational surface that reuses Supabase Auth and the existing Focus visual
system. The browser verifies the current auth session with Supabase, while database RLS remains the
authority for every candidate, evidence, source, image-reference, and moderation read. A user is a
founder only when the existing `profiles` row has `role = 'founder'` or `role = 'admin'`; users cannot
write that protected column through normal profile grants.

Research is staged separately from public venue data in additive `venue_candidate_*` tables. An
approval marks a candidate ready for a later publication step but does not insert into
`venue_branches`, so no research record can become public automatically. Moderation runs through a
security-definer RPC that rechecks the authenticated founder identity and appends a compact activity
record. Rejected candidates keep their evidence and provenance.

External venue imagery is not copied into Focus storage during research. The dashboard keeps the
source URL, inspection summary, and available attribution, then sends founders back to the provider
for the original image. This prevents unattributed re-hosting and keeps uncertainty explicit.

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

- Reconcile the externally created database schema with versioned migrations and review all grants.
- A places or opening-hours data provider.
- Analytics, monitoring, and deployment platform.
- Caching and revalidation rules for production data.
