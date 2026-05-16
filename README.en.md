# Accusation 

An unofficial **card search, filter, and deck-building** web app (PWA) for the *Accusation* living card game. Works in the browser and can be installed for offline card lookup and deck editing.

<<<<<<< HEAD
> This tool is for community fan support. Card images and game content copyright belong to the respective rights holders.
=======
> Community fan tool only. Card art and game text remain the property of their respective rights holders.
>>>>>>> 522d7f5628fccd4b0d2917c11f337da89738d387

## Features

| Mode | Description |
|------|-------------|
| **Gallery** | Search and filter by name, faction, type, symbols, mechanics; paginated grid; tap for full card detail |
| **Deck builder** | Leader / rituals / main deck slots; construction rules (single faction, dual-faction quotas); drag-and-drop main deck order; hide already selected |
| **FAQ** | Built-in Q&A section |
| **Export** | Text list, JSON backup, deck screenshot (via html2canvas) |
| **Alternate art** | Toggle main / alt art where available (preference stored in `localStorage`) |

### Technical highlights

- **Card catalog**: sharded JSON under `public/cards/` + versioned `index.json`; IndexedDB cache; cold start loads the first shard (`cro`) early for faster first paint
- **Filtering**: Web Worker when the catalog has ≥ 80 cards; virtualized gallery via `react-window` when more than 24 cards are shown at once
- **Deck pool**: virtualized when the pool has more than 24 cards (including mobile); flex layout locks the viewport—only the pool and deck panels scroll
- **Dev tooling**: `useLayoutInvariant()` in deck mode (dev only—console warn, overlay, and node highlight on violations)
- **Images**: responsive AVIF / WebP `srcset` (160 / 320 / 640); HTML preload for the LCP hero card image
- **PWA**: Workbox caches static assets, card JSON, and images; `autoUpdate` service worker

## Stack

- [Vite](https://vite.dev/) 8 · [React](https://react.dev/) 19 · [Tailwind CSS](https://tailwindcss.com/) 4
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Workbox) · [vite-plugin-compression2](https://github.com/nonzzz/vite-plugin-compression)
- [react-window](https://github.com/bvaughn/react-window) · [sortablejs](https://sortablejs.github.io/Sortable/) · [lucide-react](https://lucide.dev/)
- Image pipeline: [sharp](https://sharp.pixelplumbing.com/) (build-time)

## Requirements

- **Node.js** 20+ (LTS recommended)
- **npm** 10+

## Quick start

```bash
git clone <repo-url>
cd accusation-v2

npm install
npm run dev          # http://localhost:5173
```

```bash
npm run build        # output to dist/
npm run preview      # serve dist/ (default http://localhost:4173)
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build → `dist/` |
| `npm run build:ci` | Build + verify PWA `sw.js` (CI) |
| `npm run build:deploy` | Build and sync to `deploy-output/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run test:rule-engine` | Deck construction rule tests |
| `npm run test:card-catalog` | Card catalog loader tests |
| `npm run test:deck` | Deck domain module tests |
| `npm run test:gallery-layout` | Gallery layout estimation tests |
| `npm run test:deck-layout` | Playwright assertions for deck viewport / scroll containers |
| `npm run audit:deck-layout` | Verbose deck layout dump (debugging) |
| `npm run split:cards` | Split `public/cards.json` into `public/cards/*.json` |
| `npm run optimize:images` | Generate `-w160` / `-w320` / `-w640` WebP & AVIF from master WebP |
| `npm run check:pwa-sw` | Assert `dist/sw.js` exists |

## Project layout

```
accusation-v2/
├── public/
│   ├── cards.json          # full catalog (optional source for split:cards)
│   ├── cards/
│   │   ├── index.json      # shard manifest + version
│   │   ├── cro.json        # e.g. Crow faction shard
│   │   └── …
│   ├── images/             # card art + symbol icons (responsive -w* variants)
│   └── favicon.svg
├── scripts/                # build, test, deploy, data tooling
├── src/
│   ├── App.jsx             # shell: modes, data hooks, lazy routes
│   ├── components/         # UI (Card, CardGallery, FilterToolbar, deckBuilder/…)
│   ├── deck/               # deck domain (controller, storage, import/export)
│   ├── rules/              # pool display vs add-to-deck validity
│   ├── hooks/              # useCardData, useDeck, useLayoutInvariant, …
│   ├── dev/                # dev-build only (layout invariant checks)
│   ├── utils/              # catalog, filters, images, LCP preload
│   ├── workers/            # cardFilter.worker.js
│   ├── constants/
│   └── data/               # qaData.js
├── index.html
├── vite.config.js
└── package.json
```

## Architecture notes

- **`src/rules/deckPoolDisplay.js`**: which cards appear in the deck pool (e.g. rule2 hides leader/rituals from the secondary faction)
- **`src/rules/deckBuildValidity.js`**: whether a card may be added (faction, quotas, prompts)
- **`src/deck/createDeckController.js`**: deck state hub; `useDeck` is a thin React adapter
- Keep `CARD_IMAGE_WIDTHS` in `src/utils/cardAlternateArt.js` in sync with `scripts/optimize-images.mjs`

## Environment variables

None required today—all data is served from `public/`. For future config, use the `VITE_` prefix and document keys in `.env.example` ([Vite env docs](https://vite.dev/guide/env-and-mode.html)).

## Deployment

This repository is **source only**. Suggested static hosting flow:

1. `npm run build:deploy` — builds `dist/` and copies to `deploy-output/`
2. Publish the contents of `deploy-output/` (e.g. a separate repo wired to Cloudflare Pages)

`dist/` and `deploy-output/` are gitignored and should not be committed here.

## Data maintenance

1. **Card text**  
   Edit `public/cards.json` (or shard files) → run `npm run split:cards` if you changed the merged file → bump `version` in `public/cards/index.json` so clients refetch

2. **New card images**  
   Add `public/images/<id>.webp` → `npm run optimize:images`

3. **Construction rules**  
   Edit `src/rules/` → `npm run test:rule-engine`

4. **FAQ copy**  
   Edit `src/data/qaData.js`

## License & disclaimer

This tool is for community fan support. Card images and game content copyright belong to the respective rights holders. This repository ships tool source code only—not a license to redistribute official card assets.
