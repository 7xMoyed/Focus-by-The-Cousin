# Database — Focus by The Cousin

## Overview

Supabase PostgreSQL + PostGIS. Migrations are the single source of truth for schema.

**Project ID:** `zyzpvwpnqeflbjsfvgwc`

---

## Applying Migrations

Migrations live in `supabase/migrations/`. Run them in order via Supabase Dashboard → SQL Editor.

| File | Description |
|------|-------------|
| `20260908000000_enable_postgis.sql` | Enables PostGIS extension |
| `20260908000001_core_schema.sql` | Core tables: cities, venues, venue_branches, opening_hours, reviews, review_scores |
| `20260908000002_rls_policies.sql` | Row Level Security policies |

> ⚠️ Run migrations in order. PostGIS must exist before creating the `geography` column.

---

## Table Overview

```
cities
  └── venue_branches (via city_id)
        └── opening_hours
        └── reviews
              └── review_scores

venues
  └── venue_branches (via venue_id)
```

### `cities`
Geographic cities covered by the platform. Seeded manually by admin.

### `venues`
Brand-level venue (e.g. ستاربكس, Tim Hortons). Not rated directly — branches are.

### `venue_branches`
**Core entity.** Each branch is rated independently. Two branches of the same café can have completely different Focus Scores.

- `location` — PostGIS `geography(Point, 4326)`. Use `ST_MakePoint(lng, lat)` to insert.
- `is_published` — gates all public queries. Admin sets to `true` when ready.
- `slug` — URL-friendly unique identifier used in routes like `/venue/[slug]`.

### `opening_hours`
One row per day per branch. `day_of_week` follows JS convention: 0 = Sunday, 6 = Saturday.

### `reviews`
Time-aware user reviews. Key fields:
- `visit_time_slot` — enables "quiet in the morning" insights
- `visit_day_type` — weekday vs weekend patterns
- `study_mode` — deep_focus / group_study / remote_work
- `crowd_level` — subjective crowd density
- `is_approved` — admin must approve before review appears publicly

### `review_scores`
One row per review. All 12 scoring dimensions (1–5). Kept in a separate table so:
- Dimensions can be weighted differently for Focus Score
- Recent reviews can be weighted more heavily
- Per-mode scores can be calculated (e.g. average quietness for deep_focus visits only)

---

## Focus Score

Not stored — calculated at query time from `review_scores` where `reviews.is_approved = true`.

Planned calculation (not implemented yet):
```sql
SELECT
  branch_id,
  COUNT(*) AS review_count,
  AVG(quietness)             AS avg_quietness,
  AVG(wifi_quality)          AS avg_wifi,
  -- ... other dimensions ...
  (AVG(quietness) * 0.2 + AVG(wifi_quality) * 0.15 + ...) AS focus_score
FROM review_scores rs
JOIN reviews r ON r.id = rs.review_id
WHERE r.is_approved = true
GROUP BY branch_id;
```

Weights TBD. Minimum review count required before displaying score TBD.

---

## PostGIS

Extension enabled via migration `20260908000000`.

### Inserting a location
```sql
UPDATE venue_branches
SET location = ST_MakePoint(-46.6388, 23.6850) -- lng, lat
WHERE id = '...';
```

### Proximity queries (future)
```sql
-- Branches within 5 km of a point
SELECT id, name_ar,
  ST_Distance(location::geography, ST_MakePoint(-46.6388, 23.6850)::geography) AS distance_m
FROM venue_branches
WHERE is_published = true
  AND ST_DWithin(location::geography, ST_MakePoint(-46.6388, 23.6850)::geography, 5000)
ORDER BY distance_m;
```

---

## RLS Strategy

| Table | Public Read | Authenticated Write | Condition |
|-------|-------------|---------------------|-----------|
| `cities` | ✅ All rows | ❌ Admin/service role only | — |
| `venues` | ✅ All rows | ❌ Admin/service role only | — |
| `venue_branches` | ✅ Published only | ❌ Admin/service role only | `is_published = true` |
| `opening_hours` | ✅ If branch published | ❌ Admin/service role only | via JOIN |
| `reviews` | ✅ Approved only | ✅ Own reviews (auth pending) | `is_approved = true` |
| `review_scores` | ✅ If review approved | ✅ Own scores (auth pending) | via JOIN |

> Business owners **cannot** modify community ratings. Writes to venue data require service role.

---

## Migration Workflow

1. Write SQL in `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Test in Supabase Dashboard SQL Editor (use a transaction + ROLLBACK first)
3. Apply via Dashboard or `supabase db push`
4. Commit the migration file to Git
5. Never alter a migration that has already been applied to production — add a new one instead
