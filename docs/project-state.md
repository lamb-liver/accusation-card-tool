# Project State

Last updated: 2026-06-12

This note is the first file to read before adding features in this repo. Its purpose is to prevent duplicate implementations and accidental edits outside the requested scope.

## Main Purpose

`accusation-card-tool` is a Vite + React PWA for the card game `控訴`. It provides card lookup, filtering, deck building, community sharing, QA, and match-side utilities for players.

## Existing Features

- Card gallery and search: keyword, faction, type, symbol, and mechanic filters.
- Card detail modal: large image, metadata, complete effect text, and alternate-art support.
- Deck builder: leader / ritual / main deck sections, deck rules, drag sorting, saved decks, import/export, text export, JSON export, and image export.
- QA: built-in FAQ content from `src/data/qaData.js`.
- Community/share wall: public deck sharing, deck detail routes, guestbook, and admin moderation.
- PWA/static assets: split card JSON, responsive card images, Workbox service worker, and installable browser app.
- Match clock: two-player clock with pause/resume/reset, turn switching, low-time states, and coin-flip setup.

## Coin / Coin Flip

Coin flipping already exists. Do not add another standalone coin tool unless a future task explicitly replaces this design.

- UI entry: toolbar button `計時`, which navigates to `#/clock`.
- Route: `#/clock`, parsed in `src/hooks/useHashRoute.js`.
- Component: `src/features/clock/ClockPage.jsx`.
- Styles: `src/features/clock/ClockPage.css`.
- Purpose: decide first/second player before using the match clock.
- Related tests: `scripts/test-clock.mjs`, included in `npm run validate:repo`.

There should not be a duplicate `#/tools/coin` route or a second coin component under `src/features/tools/`.

## Clock / Timer

The clock already exists and should not be rebuilt as a new timer feature.

- UI entry: toolbar button `計時`.
- Route: `#/clock`.
- Component tree: `src/features/clock/ClockPage.jsx`, `src/features/clock/useGameClock.js`, `src/features/clock/clockEngine.js`, `src/features/clock/clockUtils.js`.
- Styles: `src/features/clock/ClockPage.css`.

Do not add a separate `#/tools/timer` placeholder or a second timer shell without first auditing the current clock implementation.

## Share Wall / Backend / API Boundary

The share-wall stack spans frontend components, API client code, Cloudflare Pages Functions, and D1 migrations. Do not modify it unless the task explicitly asks for share-wall, backend, API, deployment, or D1 work.

- Frontend API client: `src/api/shareWallApi.js`.
- Frontend UI: `src/components/community/`, `src/components/shareWall/`, `src/components/guestbook/`, `src/components/admin/`.
- Backend/API: `functions/api/` and shared backend helpers in `functions/_shared/`.
- Database migrations: `migrations/`.
- Cloudflare config: `wrangler.toml`.
- Share-wall tests: `scripts/test-share-wall.mjs`.

Do not change request/response contracts, auth/session handling, Turnstile, CSRF, D1 schema, or cache/rate-limit code as part of unrelated UI work.

## Do Not Duplicate

Before adding any of these, verify the existing route, component, hook, and tests:

- Coin flip / `擲硬幣`.
- Clock / timer / `計時`.
- Deck builder import/export.
- Share wall, guestbook, and admin moderation.
- QA route and QA content.
- Card filters, card modal, alternate-art handling, and card image helpers.
- Deployment workflow or Cloudflare Pages config.

Known invalid duplication from a prior mistake: do not recreate `src/features/tools/ToolsPage.jsx`, `src/features/tools/ToolsPage.css`, `#/tools`, `#/tools/coin`, `#/tools/dice`, or `#/tools/timer` as placeholder routes without explicit approval.

## Required Pre-Change Search

Before adding a feature, search the repo for existing surfaces:

```bash
rg -n "<feature keyword>|<route>|<Chinese UI label>" src scripts docs package.json
rg -n "parseHashRoute|navigate\\(|currentMode|lazy\\(" src
rg -n "<component name>|<hook name>" src
```

For route work, inspect:

- `src/hooks/useHashRoute.js`
- `src/App.jsx`
- `src/components/FilterToolbar.jsx`
- `scripts/test-utils.mjs`

For player tool work, inspect `src/features/clock/` first.

## Validation Commands

Run these before reporting completion:

```bash
npm run validate:repo
npm run build
npm run validate:browser
```

If one fails, fix only the relevant cause. Do not use validation failures as a reason to refactor unrelated app areas.

## Deployment Notes

- Cloudflare Pages is the production deployment source.
- `wrangler.toml` uses `pages_build_output_dir = "dist"`.
- Do not add or bind extra Workers Builds for this project.
- Do not introduce a second deployment path unless the task explicitly asks for deployment architecture changes.
