# 衝浪研究室 · The Surf Study

> A field journal for the practicing surfer — 八份田野檔案,一本非旅遊指南。

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (uses in-memory SQLite seeded from project/data/)
npm run dev

# Build for production (connects to remote Turso, needs .env)
npm run build

# Preview production build
npm run preview
```

## Stack

- **Framework**: Astro 4.16 (hybrid output)
- **Database**: Astro DB (`@astrojs/db` v0.14.3) → Turso libSQL (remote)
- **Adapter**: `@astrojs/cloudflare` v11.2 → Cloudflare Workers Builds
- **Deploy**: GitHub → Cloudflare Workers Builds → workers.dev

## Project Structure

```
surfing/
├── astro.config.mjs          # output:'hybrid' + cloudflare adapter
├── wrangler.jsonc            # Workers Builds config (main, assets, nodejs_compat)
├── package.json              # prebuild: ci-env, build: astro build --remote, postbuild: .assetsignore
├── scripts/
│   ├── ci-env.mjs            # Writes .env from process.env on CF Pages
│   ├── post-build.mjs        # Writes dist/.assetsignore (excludes _worker.js)
│   └── json-to-content.mjs   # JSON → content collection (legacy)
├── db/
│   ├── config.ts             # 8 tables (Bali/Hainan/Boards/AU/TW/JP/KR/BigWave)
│   └── seed.ts               # Loads 8 JSONs, injects _key for case-sensitive JS lookups
├── project/data/             # Source JSON (read by seed.ts at build time)
│   ├── bali.json hainan.json board.json
│   ├── australia.json taiwan.json bigwave.json
│   └── japan.json korea.json
├── src/
│   ├── layouts/
│   │   ├── Base.astro        # HTML shell, fonts, SEO, motion/common.js
│   │   └── IssuePage.astro   # Shared issue crumb-bar + mast + 8-link nav
│   └── pages/
│       ├── index.astro       # Masthead + 8 issue cards + animated surf-scene hero
│       ├── api/<X>.json.ts   # 8 API endpoints (DB → JSON via _key fallback)
│       ├── bali/{index,[slug]}.astro
│       ├── hainan/, australia/, taiwan/, japan/, korea/
│       └── boards/, bigwave/
├── public/
│   ├── styles/               # tokens.css common.css issue.css motion.css
│   ├── scripts/              # common.js motion.js map-zoom.js + 8 issue scripts
│   └── robots.txt
└── prompt.md                 # Engineering handoff doc for next AI session
```

## Content Updates

### Editing an entry
1. Edit the source JSON in `project/data/<issue>.json`
2. Re-run `npm run dev` to re-seed in-memory SQLite, OR
3. For production: re-seed remote Turso via `npx astro db execute db/seed.ts --remote` (clears + re-inserts all 8 tables)

## Design System

- **Fonts**: Abril Fatface, DM Serif Display, Yeseva One, Noto Serif TC, Noto Sans TC, JetBrains Mono
- **Themes**: Vermillion (default), Ocean, Zine, Jungle (Tweaks panel)
- **Paper grain overlay**, **halftone dot patterns**, **tag system** with semantic colors
- **Hero animation** on home page: SVG/CSS surf-scene with parallax + reduced-motion fallback

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `ASTRO_DB_REMOTE_URL` | Build time | Turso `libsql://…` URL |
| `ASTRO_DB_APP_TOKEN` | Build time | Turso auth token |

Local dev uses an in-memory SQLite seeded by `db/seed.ts`. Build (`astro build --remote`) connects to Turso. On CF Workers Builds, `scripts/ci-env.mjs` writes a `.env` file from `process.env` so Vite's `loadEnv` can pick the credentials up.

## Deployment

CI: push to `main` → Cloudflare Workers Builds → `https://surf-study.jkjking987.workers.dev`.

Configured in `wrangler.jsonc` (main entry, asset directory, nodejs_compat). Build command: `npm run build` (which is `astro build --remote`). Deploy command: `npx wrangler deploy`.

## Data Counts

| Issue | No. | Entries | Schema |
|---|---|---|---|
| Bali | 001 | 50 | mixed flat / basic_info |
| Hainan | 002 | 21 | nested basic_info (wave pool) |
| Australia | 003 | 42 | flat |
| Taiwan | 004 | 33 | flat |
| Japan | 005 | 27 | flat |
| Korea | 006 | 22 | flat |
| Board Lab | 007 | 33 | nested basic_info (board type) |
| Big Wave | 008 | 29 | nested basic_info (board type) |
| **Total** | | **257** | |

## License

© 2026 衝浪研究室 · A Personal Field Journal
