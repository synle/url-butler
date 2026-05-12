# url-butler — Architecture

## High-Level Overview

`url-butler` is a Manifest V3 Chrome extension that manages URL redirects,
chains shortlinks, syncs bookmarks, detects redirect cycles, and exposes
an omnibox / popup search interface for jumping to user-defined
shortcuts.

Runtime model:

- **Background service worker** (`src/background/index.ts`) — owns
  navigation interception, redirect resolution, omnibox handling, and
  install-time sync. Stateless across invocations; reads everything from
  `chrome.storage.local` on demand.
- **Popup UI** (`src/popup/`) — search-and-launch front door rendered
  when the toolbar action is clicked.
- **Options UI** (`src/options/`) — full-page config editor (table view,
  JSON view, settings tab, audit log, backup / restore).
- **Cycle-detection page** (`src/cycle/`) — fallback HTML page the
  background worker redirects to when a shortlink chain loops.
- **Shared modules** (`src/shared/`) — framework-free TypeScript reused
  by every entry point (background + both UIs).

UI is React 18 + MUI 5. Build is Vite 4 emitting four entry points into
`dist/`; a post-build script copies `manifest.json` + icons into place.
Tests are Vitest with a `chrome.*` stub in `src/__tests__/setup.ts`.
There is no server runtime — the extension optionally fetches config
from a user-configured `serverUrl` and optionally syncs via Google Drive
(OAuth `identity` permission).

## Key Directories

- `src/background/` — service worker entry. Wires Chrome event listeners
  (`onInstalled`, `onMessage`, `webNavigation`, omnibox) to shared logic.
- `src/popup/` — popup HTML + React entry (`main.tsx`, `Popup.tsx`).
- `src/options/` — options page HTML + React entry (`Options.tsx`).
- `src/cycle/` — standalone HTML page shown on cycle detection.
- `src/components/` — reusable React components used by options:
  `ConfigTable`, `JsonEditor`, `SettingsTab`, `BackupRestore`,
  `AuditPage`.
- `src/shared/` — framework-free logic:
  - `types.ts` — `ConfigItem`, `ConfigEntry`, `StorageData`,
    `AuditHistory`.
  - `storage.ts` — `chrome.storage.local` accessors + normalized config
    map.
  - `redirect.ts` — `resolveRedirect`, `normalizeConfig`,
    `ensureProtocol`; cycle detection.
  - `bookmarks.ts` — push configs into Chrome bookmarks.
  - `sync.ts` — fetch + merge configs from `serverUrl`.
  - `google-auth.ts` — Chrome `identity` OAuth + Drive sync.
- `src/__tests__/` — Vitest unit tests, one per shared module plus
  `setup.ts` which stubs `chrome.*` globals.
- `public/` — static assets copied into `dist/`: `manifest.json`,
  `icons/`.
- `scripts/` — Node build helpers (CommonJS / ESM mix):
  - `create-icons.cjs` — regenerates PNG icons.
  - `post-build.mjs` — rewrites manifest paths and copies icons into
    `dist/`.
- `.github/workflows/` — `build.yml` (CI on push / PR) and `release.yml`
  (manual dispatch, packages `dist/` as a versioned `.zip`).

## Important Files

- `public/manifest.json` — MV3 manifest. Name `URL Butler`. Permissions:
  `storage`, `bookmarks`, `identity`, `webNavigation`, `tabs`; host
  permissions `<all_urls>`; background service worker module; popup +
  options pages; OAuth2 client + Drive scopes.
- `vite.config.ts` — multi-entry Rollup config. Inputs: `popup`,
  `options`, `cycle` (HTML), `background` (TS). Background output is
  pinned to `background.js` (manifest reference); minify off, sourcemaps
  on; `@/` alias to `src/`.
- `scripts/post-build.mjs` — reads `public/manifest.json`, rewrites
  `background.service_worker` to `background.js`, writes to `dist/`,
  copies `public/icons/` to `dist/icons/`.
- `package.json` — npm package name is `url-butler`. Scripts: `dev`
  (vite watch), `build` (vite + post-build), `test` / `test:watch` /
  `test:coverage` (vitest), `format` (prettier), `icons`. Stack:
  React 18, MUI 5, Vite 4, Vitest 4, TS 5.
- `tsconfig.json` — TS compiler config for the React + Vite project.
- `vitest.config.ts` — test runner config, references
  `src/__tests__/setup.ts` for Chrome API stubs.
- `example-config.json` — sample server config payload (consumed by
  `sync.ts`).
- `src/background/index.ts` — service worker orchestration:
  install-time sync, message router, navigation hook, omnibox handler.
- `src/shared/redirect.ts` — single source of truth for resolution and
  cycle detection.
- `src/shared/storage.ts` — single source of truth for
  `chrome.storage.local` read / write and normalization.
- `CLAUDE.md`, `DEV.md`, `README.md` — contributor docs and
  quick-start.

## Build & Release Flow

**Local build**

1. `npm install`
2. `npm run build` → `vite build` emits HTML entries + `background.js`
   into `dist/`, then `scripts/post-build.mjs` writes the runtime
   `manifest.json` and copies icons.
3. Load `dist/` as an unpacked extension in Chrome.

`npm run dev` is the same pipeline in watch mode (post-build only runs
on explicit `build`).

**CI** — `.github/workflows/build.yml` on push / PR to `main` or
`master`:

1. `actions/checkout@v6` + `setup-node@v6` (Node 20).
2. `npm ci || npm install --no-fund --prefer-offline`.
3. `npm test` (Vitest).
4. `npm run build`.
5. Upload `dist/**` as artifact `url-butler-extension`.

**Release** — `.github/workflows/release.yml`, `workflow_dispatch` only:

1. Inputs: `tag` (e.g. `v1.0.0`) and `notes` (markdown).
2. Same install + test + build steps as CI.
3. Zip `dist/` → `release-artifacts/url-butler-<tag>.zip`.
4. `softprops/action-gh-release@v2` creates a non-draft, non-prerelease
   GitHub Release at the supplied tag with the zip attached.

There is no auto-publish to the Chrome Web Store; the release zip is
the distribution artifact (load unpacked or upload to the store
manually).
