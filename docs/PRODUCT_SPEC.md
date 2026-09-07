# MVP Product Specification

## Product summary

Focus by The Cousin helps students and remote workers decide where to study or work. The product
evaluates each physical branch for focus-related needs; it is not a general café discovery directory.

## MVP goals

- Make it easy to discover suitable study and focused-work venues in supported areas.
- Show reliable branch-level details that help a user decide before travelling.
- Prioritize Arabic while keeping content and interface architecture ready for English.
- Provide a fast, accessible, mobile-first experience.

## Initial markets

1. Al Majma’ah.
2. A limited Riyadh launch area around King Saud University and northern Riyadh.

The first release should keep the coverage boundary explicit so users understand where listings are
complete and where they are not.

## Primary users

- University students looking for individual or group study spaces.
- Remote workers looking for laptop-friendly locations and longer work sessions.

## Core user journey

1. A user chooses or confirms an area.
2. The user browses or searches branch-level venue results.
3. The user filters or sorts results using focus-related criteria.
4. The user opens a branch page and reviews its suitability.
5. The user opens a Google Maps URL for navigation.

## MVP capabilities

### Discovery

- Browse supported venues by city or launch area.
- Search by venue or branch name.
- Filter using the most decision-relevant focus criteria.
- Show whether a venue is currently open when reliable opening hours are available.

### Branch evaluation

Each branch may include:

- Quietness and expected crowd level by time.
- Seating comfort, table suitability, and laptop friendliness.
- Power outlet availability and Wi-Fi quality.
- Restroom availability and cleanliness.
- Parking availability.
- Average spending range.
- Suitability for long sessions and group study.
- Best days and times to visit.
- Distance from nearby universities.
- Opening hours and a Google Maps navigation URL.

Scores should use clear scales and explain what they mean. Unknown information must be shown as
unknown rather than guessed.

### Venue details

- Branch name, venue brand, area, and address.
- A concise focus summary and evaluation details.
- Last-reviewed or last-updated information where available.
- A clear action to navigate using Google Maps.

## Content and localization

- Arabic is the default language and page direction is right-to-left.
- User-facing strings should be structured so English can be added without redesigning features.
- Place names may retain familiar local spellings where that improves recognition.
- Ratings and descriptions should be factual, concise, and branch-specific.

## Non-functional requirements

- Mobile-first responsive layouts.
- Semantic HTML, keyboard usability, sufficient contrast, and readable type sizes.
- Fast initial page loads and sensible caching for public venue data.
- Strict TypeScript and automated lint, typecheck, formatting, and build checks.
- No secrets committed to source control.

## Explicitly out of scope

- Payments, paid plans, and subscriptions.
- Native iOS or Android applications.
- A complete production database or advanced PostGIS queries.
- User-generated reviews, public accounts, and social features.
- Venue-owner dashboards or advertising products.
- Broad nationwide coverage.

## MVP success signals

- Users can quickly identify at least one suitable location in a supported area.
- Branch pages answer the practical questions needed before a study or work session.
- Users can move from discovery to Google Maps navigation without confusion.
- Published branch data clearly distinguishes known, unknown, and recently verified information.

## Open product decisions

- The scoring scale and weighting for each focus criterion.
- The editorial verification process and refresh frequency.
- The exact Riyadh launch boundary.
- Which filters appear in the first release versus later iterations.
- Whether “currently open” is computed from stored hours or supplied by a future places provider.
