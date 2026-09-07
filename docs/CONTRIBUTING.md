# Contributing

## Before starting

Create an issue or agree on a small, testable change. Keep product work within the current MVP and do
not introduce payments, subscriptions, authentication, or production infrastructure without an
approved specification.

## Branches

Create branches from the latest default branch and never work directly on `main`.

Use short, descriptive names:

- `feature/venue-details`
- `fix/mobile-filter-overflow`
- `docs/scoring-methodology`
- `chore/update-tooling`

Keep one purpose per branch. Rebase or merge the latest default branch according to the repository
maintainer’s preference before requesting final review.

## Commits

Write imperative commit subjects that explain the outcome:

```text
Add branch suitability summary
Fix RTL spacing in venue cards
Document quietness scoring scale
```

Keep commits focused and avoid mixing formatting-only changes with product behavior when possible. Do
not commit generated build output, local environment files, credentials, or unrelated editor files.

## Local checks

Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npm run format:check
npm run build
```

Fix failures rather than disabling rules. Add or update tests when the change introduces testable
behavior.

## Pull requests

A pull request should:

- Explain the problem and the chosen solution.
- Stay limited to one coherent change.
- List validation performed.
- Include screenshots for visible interface changes.
- Call out schema, environment, accessibility, localization, or security effects.
- Link the relevant issue or product decision when one exists.

At least one reviewer should approve the pull request before merge. Address review comments with new
commits while review is active; maintainers may squash commits when merging. Never merge your own pull
request unless the team’s policy explicitly permits it.
