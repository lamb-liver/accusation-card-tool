# Accusation 

An unofficial **card search, filter, and deck-building** web app (PWA) for the *Accusation* living card game. Works in the browser and can be installed for offline card lookup and deck editing.

> Community fan tool only. Card art and game text remain the property of their respective rights holders.

## Features

| Mode | Description |
|------|-------------|
| **Gallery** | Search and filter by name, faction, type, symbols, mechanics; paginated grid; tap for full card detail |
| **Deck builder** | Leader / rituals / main deck slots; construction rules (single faction, dual-faction quotas); drag-and-drop main deck order; hide already selected |
| **FAQ** | Built-in Q&A section |
| **Community** | Guestbook, public deck submissions, and admin review |
| **Game clock** | Two-player countdown, turn switching, and move tracking |
| **Export** | Text list, JSON backup, deck screenshot (via html2canvas) |
| **Alternate art** | Toggle main / alt art where available (preference stored in `localStorage`) |

### Technical highlights

- **Card catalog**: one `public/cards.json` file (currently ~51 KB / ~7 KB gzip); browser and Workbox caching handle repeat requests
- **Filtering**: direct synchronous filtering over 156 cards; pagination limits gallery render size
- **Deck pool**: single scroll container for the card pool, avoiding nested page/pool scroll conflicts
- **Images**: responsive AVIF / WebP `srcset` (160 / 320 / 640); HTML preload for the LCP hero card image
- **PWA**: Workbox caches static assets, card JSON, and images; `autoUpdate` service worker

## Stack

- [Vite](https://vite.dev/) 8 · [React](https://react.dev/) 19 · [Tailwind CSS](https://tailwindcss.com/) 4
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Workbox)
- [sortablejs](https://sortablejs.github.io/Sortable/) · [lucide-react](https://lucide.dev/)
- Image pipeline: [sharp](https://sharp.pixelplumbing.com/) (build-time)
- Cloudflare Pages Functions · D1 · Turnstile

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

To test Pages Functions and D1 locally:

```bash
npm run d1:migrations:apply:local
npm run cf:dev       # build, then start the complete app with Wrangler
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build → `dist/` |
| `npm run build:ci` | Build + verify PWA `sw.js` (CI) |
| `npm run build:deploy` | Build and sync to `deploy-output/` |
| `npm run preview` | Preview production build |
| `npm run validate:repo` | Full repo check for assets, generated files, lockfile, deploy flow, lint, and core tests |
| `npm run validate:browser` | Start or reuse a local site, then run deck layout and horizontal overflow checks |
| `npm run lint` | ESLint |
| `npm run check:assets` | Verify the current `public/` asset reference chain is present |
| `npm run check:generated` | Verify generated files match their source data |
| `npm run check:lockfile` | Verify `package-lock.json` matches `package.json` |
| `npm run check:public-orphans` | Report files under `public/` not used by the current reference chain |
| `npm run clean:public-orphans` | Dry-run safe public asset cleanup; add `-- --apply` to remove files |
| `npm run check:deploy-flow` | Audit deploy workflow, `wrangler.toml`, and `sync-deploy` high-risk settings |
| `npm run doctor:build-env` | Diagnose local Node/Vite/Rolldown native binding state |
| `npm run test:rule-engine` | Deck construction rule tests |
| `npm run test:card-catalog` | Card catalog loader tests |
| `npm run test:deck` | Deck domain module tests |
| `npm run test:deck-layout` | Playwright assertions for deck viewport / scroll containers |
| `npm run audit:deck-layout` | Verbose deck layout dump (debugging) |
| `npm run optimize:images` | Generate `-w160` / `-w320` / `-w640` WebP & AVIF from master WebP |
| `npm run check:pwa-sw` | Assert `dist/sw.js` exists |
| `npm run cf:dev` | Build and start Cloudflare Pages Functions with local D1 |
| `npm run d1:migrations:apply:local` | Apply D1 migrations to the local database |

## Project layout

```
accusation-v2/
├── public/
│   ├── cards.json          # single source of truth for the card catalog
│   ├── images/             # card art + symbol icons (responsive -w* variants)
│   └── favicon.svg
├── functions/              # Cloudflare Pages Functions API
├── migrations/             # D1 schema and indexes
├── shared/                 # deck rules shared by frontend and backend
├── scripts/                # build, test, deploy, data tooling
├── src/
│   ├── App.jsx             # shell: modes, data hooks, lazy routes
│   ├── components/         # UI (Card, CardGallery, FilterToolbar, deckBuilder/…)
│   ├── deck/               # deck domain (controller, storage, import/export)
│   ├── rules/              # pool display vs add-to-deck validity
│   ├── hooks/              # useCardData, useDeck, …
│   ├── utils/              # catalog, filters, images, LCP preload
│   ├── constants/
│   └── data/               # qaData.js
├── index.html
├── vite.config.js
├── wrangler.toml           # Pages output and D1 binding
└── package.json
```

## Architecture notes

- **`src/rules/deckPoolDisplay.js`**: which cards appear in the deck pool (e.g. rule2 hides leader/rituals from the secondary faction)
- **`src/rules/deckBuildValidity.js`**: whether a card may be added (faction, quotas, prompts)
- **`src/deck/createDeckController.js`**: deck state hub; `useDeck` is a thin React adapter
- Keep `CARD_IMAGE_WIDTHS` in `src/utils/cardAlternateArt.js` in sync with `scripts/optimize-images.mjs`

## Environment variables

Card lookup and local deck building need no environment variables. Community writes and admin features use:

| Variable | Purpose |
|----------|---------|
| `ALLOWED_ORIGINS` | Comma-separated origins allowed to submit and perform admin mutations |
| `ADMIN_PASSWORD` | Admin login password |
| `ADMIN_SESSION_SECRET` | HMAC secret for the admin cookie |
| `VITE_TURNSTILE_SITE_KEY` | Frontend Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Turnstile secret used by Pages Functions |
| `ENVIRONMENT=production` | Enables production Turnstile, Secure cookies, and rate-limit checks |

Use `REQUIRE_CSRF_HEADER=false` and `RATE_LIMIT_DISABLED=true` only for controlled local debugging.

## Deployment

For the complete app, connect this repository to Cloudflare Pages with `npm run build` as the build command and `dist` as the output directory. Cloudflare deploys `functions/` as Pages Functions; the D1 binding and migrations live in `wrangler.toml` and `migrations/`.

Run `npm run d1:migrations:apply:remote` after the first deployment or a schema change. `npm run build:deploy` and the GitHub Actions `deploy-output` artifact contain static output only, so they are suitable for backups or frontend-only previews—not the Pages Functions API.

`dist/` and `deploy-output/` are gitignored and should not be committed.

## Data maintenance

1. **Card text**  
   Edit the single source `public/cards.json` → run `npm run cards:manifest` → `npm run validate:repo`

2. **New card images**  
   Add `public/images/<id>.webp` → `npm run optimize:images`

3. **Construction rules**  
   Edit `src/rules/` → `npm run test:rule-engine`

4. **FAQ copy**  
   Edit `src/data/qaData.js`

## License & disclaimer

This tool is for community fan support. Card images and game content copyright belong to the respective rights holders. This repository ships tool source code only—not a license to redistribute official card assets.
