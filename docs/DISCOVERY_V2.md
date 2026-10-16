# Focus Discovery V2

## Product behavior

- First-time visitors complete the lightweight discovery flow, see a teaser, then authenticate to reveal results.
- Returning authenticated users go directly to `/results`, seeded from their saved Focus profile.
- Theme, incomplete discovery progress, search controls and anonymous saves are stored on the device.
- Account preferences, completed discovery sessions and saved venues are stored in Supabase under user-owned RLS policies.
- Focus does not use an IP address as a user identity or personalization key.
- Precise browser location is requested only after `Near me` is selected and remains in `sessionStorage` for at most 30 minutes.

## Search interface

`GET /api/venues` remains public and read-only. Supported query parameters are:

- `city=riyadh|majmaah`
- `q=<place or neighborhood>` (maximum 80 characters)
- `type=cafe|library|coworking`
- `openNow=true`
- `sort=default|name|rating`
- `limit=1..50`
- `page=1..100`

Only published branches and founder-approved public enrichment are returned. Unknown facilities remain omitted.

`20261017123000_add_branch_geography.sql` adds a generated PostGIS geography point, a partial GiST index for published branches, and a bounded nearby-search function. Visitor coordinates remain session-only and are never written by the function.

## Launch cohort

The target Riyadh cohort is WEE, Seen Al Muruj, COMMUNE Al Qirawan, Wooden Coffee Al Malqa,
Mahd Cultural Cafe Al Narjis, Ashjar Al Qirawan, The Cultural House Altaawun and King Fahad
National Library. Every branch remains pending until its identity, evidence, imagery and duplicate check
are approved in Founder Studio.

The current evidence set contains one documented Al Majma’ah candidate: Majmaah University Central
Library. Publish it only after founder verification. Do not invent three additional branches to fill the
target; the missing café, university-adjacent and long-session coverage is an explicit research gap.

## Theme and accessibility

- The first visit follows the operating-system color scheme.
- A user choice overrides the system and is saved as `focus-theme-v1`.
- Light and dark palettes share semantic CSS variables; components must not infer theme in business logic.
- Motion respects `prefers-reduced-motion`, controls retain visible focus states and touch targets are at least 44px.
