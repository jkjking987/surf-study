# 衝浪研究室 · The Surf Study

> A field journal for the practicing surfer — 三份田野檔案,一本非旅遊指南。

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
surfing/
├── astro.config.mjs          # Astro configuration
├── package.json
├── tsconfig.json
├── scripts/
│   └── json-to-content.mjs   # Converts source JSON → content files
├── src/
│   ├── content/               # Astro Content Collections
│   │   ├── config.ts          # Zod schemas for all collections
│   │   ├── bali/              # 50 entries (spots, services, practical)
│   │   ├── hainan/            # 21 entries (wave pools, spots, schools)
│   │   └── boards/            # 33 entries (board types A-E)
│   ├── layouts/
│   │   ├── Base.astro         # HTML shell, fonts, SEO meta
│   │   └── IssuePage.astro    # Shared issue page wrapper
│   ├── pages/
│   │   ├── index.astro        # Masthead landing page
│   │   ├── bali/index.astro   # Bali issue (50 entries, 6 modes)
│   │   ├── hainan/index.astro # Hainan issue (21 entries, 6 modes)
│   │   └── boards/index.astro # Board Lab (33 entries, 3 modes)
│   └── styles/                # Design system CSS (also in public/)
├── public/
│   ├── styles/                # CSS served statically
│   │   ├── tokens.css         # Design tokens, fonts, colors
│   │   ├── common.css         # Tweaks panel, search, favorites
│   │   └── issue.css          # Issue page layouts, cards, detail
│   ├── scripts/               # JS served statically
│   │   ├── common.js          # Theme, favorites, global search
│   │   ├── bali.js            # Bali interactivity
│   │   ├── hainan.js          # Hainan interactivity
│   │   └── board.js           # Board Lab interactivity
│   ├── data/                  # Source JSON (also used by client JS)
│   │   ├── bali.json          # 50 entries, ~527 KB
│   │   ├── hainan.json        # 21 entries, ~242 KB
│   │   └── board.json         # 33 entries, ~605 KB
│   └── robots.txt
└── project/                   # Original static prototype (preserved)
```

## Content Updates

### Editing an entry

1. Edit the source JSON in `project/data/bali.json` (or hainan/board)
2. Run `npm run convert` to regenerate content files
3. The dev server will hot-reload automatically

### Adding a new entry

1. Add the entry to the appropriate JSON file in `project/data/`
2. Run `npm run convert`
3. The new entry will appear in the index and be searchable

## Design System

The site uses a custom editorial design system with:
- **6 font stacks**: Abril Fatface, DM Serif Display, Yeseva One, Noto Serif TC, Noto Sans TC, JetBrains Mono
- **4 themes**: Vermillion (default), Ocean, Zine, Jungle
- **Paper grain overlay** via SVG noise filter
- **Halftone dot patterns** for visual texture
- **Tag system** with semantic color coding

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SITE_URL` | No | Production URL (default: `https://surf-study.pages.dev`) |

No API keys required for the current static version.

## Deployment

### Cloudflare Pages
```bash
npm run build
# Upload the `dist/` directory to Cloudflare Pages
```

### Vercel
```bash
# Connect repo to Vercel, it auto-detects Astro
```

## Data Counts

| Collection | Entries | Source |
|---|---|---|
| Bali | 50 | Surf spots, services, practical info |
| Hainan | 21 | Wave pools, natural spots, schools |
| Boards | 33 | Board types, brands, scenarios |
| **Total** | **104** | |

## License

© 2026 衝浪研究室 · A Personal Field Journal
