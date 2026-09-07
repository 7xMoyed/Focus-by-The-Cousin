-- Migration: Row Level Security Policies
-- Enables RLS on all tables and defines access rules.
--
-- Security model:
-- - Public users: can READ published venues/branches/cities/opening_hours
-- - Public users: can READ approved review scores
-- - Authenticated users: can INSERT their own reviews + scores
-- - Authenticated users: can UPDATE/DELETE only their own reviews
-- - Authenticated users: CANNOT modify ratings/content of others
-- - Writes to cities/venues/venue_branches require service role (admin only)

-- ─── Enable RLS ──────────────────────────────────────────────────────────────

ALTER TABLE cities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues          ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_branches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE opening_hours   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews         ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_scores   ENABLE ROW LEVEL SECURITY;

-- ─── cities: public read, admin write ────────────────────────────────────────

CREATE POLICY "cities: anyone can read"
  ON cities FOR SELECT
  USING (true);

-- ─── venues: public read, admin write ────────────────────────────────────────

CREATE POLICY "venues: anyone can read"
  ON venues FOR SELECT
  USING (true);

-- ─── venue_branches: only published are public ────────────────────────────────

CREATE POLICY "venue_branches: anyone can read published"
  ON venue_branches FOR SELECT
  USING (is_published = true);

-- ─── opening_hours: readable if branch is published ──────────────────────────

CREATE POLICY "opening_hours: readable for published branches"
  ON opening_hours FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM venue_branches vb
      WHERE vb.id = opening_hours.branch_id
        AND vb.is_published = true
    )
  );

-- ─── reviews: approved reviews are public ────────────────────────────────────

CREATE POLICY "reviews: anyone can read approved"
  ON reviews FOR SELECT
  USING (is_approved = true);

-- NOTE: Review INSERT policy will be added when Supabase Auth is implemented.
-- Users will only be able to insert reviews for themselves (auth.uid() = user_id).
-- Until then, review submission is handled via service role (admin).

-- ─── review_scores: readable with parent approved review ─────────────────────

CREATE POLICY "review_scores: readable for approved reviews"
  ON review_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_scores.review_id
        AND r.is_approved = true
    )
  );

-- NOTE: review_scores INSERT/UPDATE will mirror review ownership policies
-- once Auth is implemented. A user can only write scores for their own review.
