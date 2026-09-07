# Focus by The Cousin

> دليلك لأفضل أماكن التركيز والمذاكرة خارج المنزل

## About

**Focus by The Cousin** is a platform that helps students and remote workers discover the best cafes and study spots — rated specifically for studying and deep focus, not just as cafes.

Every location is evaluated on criteria that matter to students:
- Noise level, seating comfort, power outlets
- Wi-Fi quality, table suitability for laptops/books
- Long-stay tolerance, crowd levels by time
- Suitability for solo study or group study

**Initial coverage:** Al-Majmaah & North Riyadh (around King Saud University)

## Tech Stack

- **Next.js** (App Router) — TypeScript
- **Tailwind CSS**
- **Supabase** (PostgreSQL) — to be connected
- **Google Maps** — directions integration (planned)

## Local Development

```bash
# Clone the repo
git clone https://github.com/7xMoyed/Focus-by-The-Cousin.git
cd Focus-by-The-Cousin

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type check without emitting |

## Branch Strategy

- `main` — stable code only
- `feat/*` — new features (always PR, never push directly to main)
- `fix/*` — bug fixes
- `chore/*` — maintenance

## Documentation

- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) — Product requirements
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Technical architecture
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — How to contribute
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — Architectural decision records

## Status

🚧 **Foundation phase** — project structure being established.
Supabase not yet connected. No database operations.
