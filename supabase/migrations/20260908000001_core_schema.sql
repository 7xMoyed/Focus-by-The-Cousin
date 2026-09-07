-- Migration: Core Schema — Focus by The Cousin
-- Tables: cities, venues, venue_branches, opening_hours, reviews, review_scores
--
-- Design decisions:
-- - venue_branches are rated INDEPENDENTLY — two branches of the same café have different scores
-- - review_scores is a separate table so dimensions can be queried/weighted individually
-- - location uses PostGIS geography(Point,4326) for future proximity queries
-- - is_published gates all public-facing queries — admin adds content before going live
-- - user_id is nullable on reviews until Supabase Auth is wired up

-- ─── cities ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cities (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar     text        NOT NULL,
  name_en     text,
  slug        text        NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE cities IS 'Geographic cities covered by the platform (e.g. المجمعة، الرياض)';

-- ─── venues ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS venues (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar          text        NOT NULL,
  name_en          text,
  slug             text        NOT NULL UNIQUE,
  venue_type       text        NOT NULL DEFAULT 'cafe'
                               CHECK (venue_type IN ('cafe', 'library', 'coworking', 'restaurant')),
  description_ar   text,
  logo_url         text,
  website_url      text,
  instagram_handle text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE venues IS 'Brand-level venue (e.g. ستاربكس). Branches are rated independently.';

-- ─── venue_branches ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS venue_branches (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id            uuid        NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  city_id             uuid        NOT NULL REFERENCES cities(id),
  name_ar             text,
  name_en             text,
  slug                text        NOT NULL UNIQUE,
  address_ar          text,
  google_maps_url     text,
  location            geography(Point, 4326),
  phone               text,
  average_spend_min   numeric(8,2),
  average_spend_max   numeric(8,2),
  is_published        boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE venue_branches IS 'Individual branch — each rated independently. location uses PostGIS for proximity queries.';
COMMENT ON COLUMN venue_branches.location IS 'PostGIS geography(Point,4326): ST_MakePoint(longitude, latitude)';

-- Spatial index for proximity queries (venues near me, within X km, etc.)
CREATE INDEX IF NOT EXISTS venue_branches_location_idx
  ON venue_branches USING GIST (location);

-- Index for city-based listing queries
CREATE INDEX IF NOT EXISTS venue_branches_city_id_published_idx
  ON venue_branches (city_id, is_published);

-- ─── opening_hours ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS opening_hours (
  id           uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id    uuid     NOT NULL REFERENCES venue_branches(id) ON DELETE CASCADE,
  day_of_week  smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  opens_at     time,
  closes_at    time,
  is_closed    boolean  NOT NULL DEFAULT false,
  UNIQUE (branch_id, day_of_week)
);

COMMENT ON TABLE opening_hours IS '0=Sunday, 1=Monday, ..., 6=Saturday. Aligned with JS Date.getDay().';

-- ─── reviews ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reviews (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id        uuid        NOT NULL REFERENCES venue_branches(id) ON DELETE CASCADE,
  user_id          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_name     text,
  visit_date       date,
  visit_time_slot  text        CHECK (visit_time_slot IN ('morning', 'afternoon', 'evening', 'night')),
  visit_day_type   text        CHECK (visit_day_type IN ('weekday', 'weekend')),
  study_mode       text        CHECK (study_mode IN ('deep_focus', 'group_study', 'remote_work')),
  crowd_level      text        CHECK (crowd_level IN ('empty', 'light', 'moderate', 'busy', 'packed')),
  duration_minutes smallint    CHECK (duration_minutes > 0),
  comment_ar       text,
  image_url        text,
  is_approved      boolean     NOT NULL DEFAULT false,
  is_verified      boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE reviews IS 'Time-aware reviews. visit_date + visit_time_slot enable "quiet in the morning" insights.';
COMMENT ON COLUMN reviews.user_id IS 'Nullable until Supabase Auth is implemented.';
COMMENT ON COLUMN reviews.is_approved IS 'Admin-approved before appearing publicly.';

CREATE INDEX IF NOT EXISTS reviews_branch_id_approved_idx
  ON reviews (branch_id, is_approved);

CREATE INDEX IF NOT EXISTS reviews_user_id_idx
  ON reviews (user_id) WHERE user_id IS NOT NULL;

-- ─── review_scores ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_scores (
  review_id          uuid     PRIMARY KEY REFERENCES reviews(id) ON DELETE CASCADE,
  quietness          smallint CHECK (quietness BETWEEN 1 AND 5),
  seating            smallint CHECK (seating BETWEEN 1 AND 5),
  power_outlets      smallint CHECK (power_outlets BETWEEN 1 AND 5),
  wifi_quality       smallint CHECK (wifi_quality BETWEEN 1 AND 5),
  table_suitability  smallint CHECK (table_suitability BETWEEN 1 AND 5),
  restroom           smallint CHECK (restroom BETWEEN 1 AND 5),
  parking            smallint CHECK (parking BETWEEN 1 AND 5),
  laptop_friendliness smallint CHECK (laptop_friendliness BETWEEN 1 AND 5),
  long_session       smallint CHECK (long_session BETWEEN 1 AND 5),
  solo_study         smallint CHECK (solo_study BETWEEN 1 AND 5),
  group_study        smallint CHECK (group_study BETWEEN 1 AND 5),
  remote_work        smallint CHECK (remote_work BETWEEN 1 AND 5)
);

COMMENT ON TABLE review_scores IS 'Structured scoring dimensions (1–5) per review. Kept separate so dimensions can be weighted independently for Focus Score calculation.';
