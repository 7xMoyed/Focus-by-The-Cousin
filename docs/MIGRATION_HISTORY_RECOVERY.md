# Supabase migration history recovery

Verified on 2026-10-29 against project `zyzpvwpnqeflbjsfvgwc`.

## Current state

The repository contains 13 migration files, while the remote migration history contains only:

- `20260915075718_add_profiles_and_discovery_sessions`
- `20260917213000_add_founder_venue_review`
- `20260919190000_add_curated_place_photos`

The first remote entry has the same migration name as the local
`20260915120000_add_profiles_and_discovery_sessions.sql`, but a different version. Later schema and
seed effects are present in production even though their versions are absent from migration history.

Verified production evidence includes:

- profile and discovery-session hardening columns, constraints, indexes, and validation function;
- profile preference columns;
- founder candidate, source, evidence, image, moderation, photo-choice, and facility structures;
- all three diverse seed candidates and all 18 `@asmaajuly` candidates;
- saved venues, PostGIS branch coordinates and nearby-search function;
- likes, reviewer profiles/submissions, public reviewer functions, and reviewer photo bucket.

This is history drift, not a request to re-run the migration SQL. Re-running all files could overwrite
reviewed data or make the history mismatch harder to recover.

## Safe recovery procedure

The commands below assume Supabase CLI v3.x. They target a hosted project, so every hosted
`migration list` and `migration repair` command includes `--remote`.

1. Take a production backup or confirm a recent restorable backup.
2. Re-run the read-only sentinel audit for every local migration and compare important function bodies,
   constraints, indexes, RLS policies, and seed counts—not only table existence.
3. Verify the installed CLI version, authenticate, and link this repository to the verified production
   project:

   ```powershell
   supabase --version
   supabase login
   supabase link --project-ref zyzpvwpnqeflbjsfvgwc
   ```

4. Export the current remote migration list and keep it with the recovery evidence:

   ```powershell
   supabase migration list --remote
   ```

5. Repair the mismatched first version as one operation. The CLI will ask for confirmation because
   this changes migration history on the hosted project; review the prompt before confirming:

   ```powershell
   supabase migration repair 20260915075718 --status reverted --remote
   supabase migration repair 20260915120000 --status applied --remote
   ```

6. Mark only the already-proven, history-missing versions as applied. Do not include the two versions
   already recorded remotely (`20260917213000` and `20260919190000`):

   ```powershell
   supabase migration repair `
     20260915193000 20260915194500 20260916213000 `
     20260920180000 20260920193000 20260920213000 20260924150000 `
     20261017120000 20261017123000 20261028120000 `
     --status applied --remote
   ```

7. Run `supabase migration list --remote` from the linked repository and confirm the remote and local
   version columns align exactly before any future `db push`.
8. Run schema diff/advisors and smoke-test Auth, discovery, founder review, saved venues, likes,
   reviewers, Storage, and nearby search.

## Required access

The repair command requires a linked CLI session with scoped `database_write` access (and may require
`database_pooling_config_read`). Do not edit `supabase_migrations.schema_migrations` manually and do
not run a partial repair with only some of the missing versions. Do not add `--yes` to this manual
recovery procedure; the hosted-project confirmation is a deliberate safety checkpoint.
