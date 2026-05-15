# Accusation — Card Browser & Deck Builder (accusation-v2)

> 中文： [README.md](./README.md)

A frontend-only companion for *Accusation*, a **Living Card Game (LCG)**: browse cards, filter, and build decks. Card data lives in `public/cards.json`; images in `public/images/`.

## Tech stack

- **React 19** + **Vite 8**
- **Tailwind CSS 4**
- **PWA** (`vite-plugin-pwa`)
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

## Project layout (brief)

- `public/cards.json` — Full card data (id, name, faction, type, effect, symbols, `source`, etc.)
- `public/images/{id}.webp` — Default art
- `src/components/` — UI (`Card.jsx`, `CardGallery.jsx`, `CardModal.jsx`, deck builder, …)
- `src/hooks/` — Data, deck, filters, modal logic
- `src/hooks/deck/importExport.js` — Text / JSON / **image** export
- `src/utils/cardAlternateArt.js` — Alt-art paths, localStorage preference, sync event

## Card data & images

- Each card needs **`public/images/{id}.webp`** (`id` must match `cards.json`).
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
