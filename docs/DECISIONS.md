# Architectural Decisions — Focus by The Cousin

## ADR-001: Next.js App Router

**Decision:** Use Next.js with App Router (not Pages Router).
**Reason:** Better performance with Server Components, simpler data fetching, modern React patterns.
**Date:** 2026-09-07

## ADR-002: Supabase as Backend

**Decision:** Use Supabase (PostgreSQL) as the primary database and auth provider.
**Reason:** Managed PostgreSQL with real-time capabilities, built-in auth, and generous free tier. Good fit for a hobby project.
**Status:** Pending — Supabase project credentials not yet connected.
**Date:** 2026-09-07

## ADR-003: Arabic First

**Decision:** Build the UI in Arabic first, with i18n structure ready for English.
**Reason:** Target users are Arabic speakers in Saudi Arabia. English can be added later.
**Date:** 2026-09-07

## ADR-004: Mobile-First Design

**Decision:** Design for mobile screens first, then enhance for desktop.
**Reason:** Target users are students who access the platform on phones while out.
**Date:** 2026-09-07

## ADR-005: No Local Database

**Decision:** No local SQLite or mock database. Use Supabase only.
**Reason:** Avoid data inconsistency and simplify the stack. Development will use the real Supabase project (with appropriate test data).
**Date:** 2026-09-07
