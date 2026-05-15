# Accusation — Card Browser & Deck Builder (accusation-v2)

> 中文： [README.md](./README.md)

A frontend-only companion for *Accusation*, a **Living Card Game (LCG)**: browse cards, filter, and build decks. At runtime, card data is loaded from sharded JSON under `public/cards/`; images live in `public/images/`.

## Tech stack

- **React 19** + **Vite 8**
- **Tailwind CSS 4**
- **react-window** (virtualized long lists)
- **PWA** (`vite-plugin-pwa` / Workbox)
- **html2canvas** (deck image export)
- **lucide-react**, **SortableJS**

## Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Local dev server |
| `npm run build` | Production build (output: `dist/`) |
| `npm run build:ci` | Build and verify PWA service worker |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run split:cards` | Generate `public/cards/` shards and `index.json` from `public/cards.json` |
| `npm run optimize:images` | Batch WebP / AVIF responsive assets (`scripts/optimize-images.mjs`) |

> After editing card data, run `npm run split:cards` before build or deploy so runtime shards stay in sync.

## Project layout (brief)

```
public/
  cards.json              # Single source of truth (authoring)
  cards/
    index.json            # Shard index (version, shards)
    {cro,fox,dor,asy,exi}.json
  images/{id}.webp        # Default art; alt: {id}alt.webp

src/
  App.jsx                 # Modes, filter / pagination / deck wiring
  hooks/
    useCardData.js        # Sharded fetch + IndexedDB cache
    useCardFilters.js     # Search / filters (Transition, Deferred, Worker)
    usePagination.js      # Gallery pagination
    deck/                 # Deck storage, rules, import/export
  workers/
    cardFilter.worker.js  # Background filtering for large sets
  utils/
    cardFilterLogic.js    # Shared filter logic (main thread + worker)
    cardCache.js          # IndexedDB read/write
    cardAlternateArt.js   # Alt-art paths, localStorage, sync event
    imageHints.js         # preload / idle prefetch
  components/
    Card.jsx, CardGallery.jsx, CardModal.jsx
    common/OptimizedImage.jsx
    DeckBuilder.jsx, FilterToolbar.jsx, …
```

## Card data workflow

1. **Author** `public/cards.json` (id, name, faction, type, effect, symbols, `source`, etc.).
2. **Shard** with `npm run split:cards` → `public/cards/*.json` and `index.json` (by id prefix).
3. **Runtime** (`useCardData`):
   - Fetch `/cards/index.json`, then shards in parallel;
   - If IndexedDB has the same `version`, show cache first and revalidate in the background;
   - PWA Workbox also caches `/cards/` with `StaleWhileRevalidate` for offline / repeat visits.

## Performance & UI behavior

| Mechanism | Where | Purpose |
|-----------|--------|---------|
| `startTransition` | `useCardFilters` | Search / filter updates are non-urgent; typing stays responsive |
| `useDeferredValue` | `useCardFilters` → `App` | Gallery / deck list render deferred results for smoother scrolling |
| Web Worker | `cardFilter.worker.js` | Filtering runs off the main thread when card count ≥ 80; sync fallback until ready |
| Virtualization | `CardGallery` (react-window) | Grid virtualized when page size > 24 or in deck pool |
| `content-visibility` | `index.css` `.card-list-cell` | Skip layout/paint off-screen (intrinsic row height ~320px) |
| IndexedDB | `cardCache.js` | Avoid re-parsing all shard JSON on every visit |
| Images | `OptimizedImage` | AVIF/WebP `<picture>`, Intersection Observer lazy load, clear `src` on unmount to drop decoded bitmaps |
| PWA image cache | `vite.config.js` | WebP/AVIF `CacheFirst`; small PNG icons cached separately |

Gallery defaults to 24 cards per page; “show all” with more than 24 results enables virtualization. Changing filters resets pagination to page 1.

## Card data & images

- Each card needs **`public/images/{id}.webp`** (`id` must match `cards.json`).
- Run `npm run optimize:images` to generate multi-width WebP/AVIF and `srcset` (see `scripts/optimize-images.mjs`).
- **Acquisition** is stored in `source` (string). If omitted, the acquisition line may be hidden on cards and in the detail modal.

## Alternate art

Cards with alternate art must include in `cards.json`:

- `hasAlternateArt`: `true`
- `alternateSource`: acquisition text for the alt version (string; required for alt-art UI to appear)

File naming:

- Default: `public/images/{id}.webp`
- Alternate: `public/images/{id}alt.webp` (e.g. `cro01` → `cro01alt.webp`)

Users switch default / alternate with **`<` `>`** on gallery cards and in the detail modal. The choice is stored in **localStorage** (key: `accusation-card-art-variant`) and stays in sync across views.

The acquisition line on gallery cards and in the modal shows `source` or `alternateSource` depending on the active art.

## Deck image export

- Exported PNG is a grid of card images **only** (no title bar, no per-card name overlay).
- Cards with alternate art use the **same version as localStorage / the UI** (default or alt); all others use default art.

## Assets & copyright

Card art and rules text belong to the original publisher / designers. Images in this repo are for personal or development use only; do not redistribute commercially without permission.

## License (source code)

Unless a `LICENSE` file is present at the repo root, source licensing is unspecified.
