# Contributing — Focus by The Cousin

## Branch Strategy

- `main` — stable, production-ready code
- `feat/*` — new features
- `fix/*` — bug fixes
- `chore/*` — maintenance tasks

**Never push directly to `main`.**
Always open a Pull Request from your feature branch.

## Development Setup

```bash
git clone https://github.com/7xMoyed/Focus-by-The-Cousin.git
cd Focus-by-The-Cousin
npm install
cp .env.example .env.local
# Fill in .env.local with your own credentials
npm run dev
```

## Code Standards

- TypeScript strict mode — no `any` types
- ESLint must pass with no errors
- `tsc --noEmit` must pass
- Components should be small and focused
- Arabic UI text — English code

## Commit Messages

Follow conventional commits:
```
feat: add place rating component
fix: correct Wi-Fi score calculation
chore: update dependencies
docs: add architecture overview
```

## Pull Request Process

1. Create a branch from `main`
2. Make changes
3. Run `npm run lint` and `npx tsc --noEmit`
4. Open PR with a clear description
5. Wait for review before merging
