# url-butler — Architecture

## High-Level Overview

URL Butler is a **Chrome browser extension** (Manifest V3) that manages URL
redirects with shortlink chaining, bookmark syncing, cycle detection, and
omni-search. It is written in **TypeScript + React 18** and bundled with
**Vite**.

Runtime model — three independent extension surfaces all driven from a single
codebase:

- A **background service worker** (`background.js`) that listens for
  `webNavigation` / `tabs` events and rewrites outgoing URLs using the
  user's redirect rules.
- A **toolbar popup** (React app) for quick lookups and triggering common
  actions.
- An **options page** (React app) for editing the redirect config, running
  audits, backup/restore, and managing Google Drive sync.
- A dedicated **cycle-detection page** (React app) that surfaces redirect
  loops in the configured rules.

The popup, options, and cycle pages are each separate HTML entry points; they
share state with the background worker through `chrome.storage` and message
passing. Google Drive sync uses `chrome.identity` (OAuth2) to push and pull
the redirect config.

## Key Directories

```
url-butler/
├── public/                 # Static assets copied verbatim into dist/
│   ├── manifest.json       # MV3 manifest (source of truth)
│   └── icons/              # Toolbar/extension icons
├── src/
│   ├── background/         # MV3 service worker entry
│   ├── popup/              # Toolbar popup React app (HTML + main.tsx + Popup.tsx)
│   ├── options/            # Options page React app
│   ├── cycle/              # Cycle-detection page React app
│   ├── components/         # Shared React components (config table, audit, JSON editor…)
│   ├── shared/             # Cross-surface logic: redirect engine, storage, sync, auth, types
│   └── __tests__/          # Vitest unit tests
├── scripts/
│   ├── post-build.mjs      # Copies manifest + icons into dist/, fixes paths
│   └── create-icons.cjs    # Regenerates PNG icons
├── .github/workflows/
│   ├── build.yml           # CI: typecheck + tests + build on PRs
│   └── release.yml         # Manual release workflow (workflow_dispatch)
├── vite.config.ts          # Multi-entry Vite build config
├── vitest.config.ts        # Test runner config
└── example-config.json     # Sample redirect ruleset
```

## Important Files

- **`public/manifest.json`** — MV3 manifest. Declares the service worker
  (`src/background/index.ts`), the popup (`src/popup/index.html`), the options
  page (`src/options/index.html`), required permissions (`storage`,
  `bookmarks`, `identity`, `webNavigation`, `tabs`), host permissions
  (`<all_urls>`), and the Google OAuth2 client info for Drive sync.

- **`src/background/index.ts`** — The service worker. Single entry point;
  hooks `webNavigation` / `tabs` events and applies redirect rules loaded
  from storage. Re-emits messages so the popup/options pages can react.

- **`src/popup/Popup.tsx`** (entry: `src/popup/main.tsx`, `src/popup/index.html`)
  — Toolbar popup UI. Reads the current tab and the active redirect config
  from `chrome.storage` and offers quick actions.

- **`src/options/Options.tsx`** (entry: `src/options/main.tsx`,
  `src/options/index.html`) — Full settings UI. Hosts `SettingsTab`,
  `ConfigTable`, `JsonEditor`, `BackupRestore`, and `AuditPage` from
  `src/components/`.

- **`src/cycle/CycleDetection.tsx`** (entry: `src/cycle/main.tsx`,
  `src/cycle/index.html`) — Standalone page that walks the redirect graph and
  reports cycles.

- **`src/shared/redirect.ts`** — Core redirect-resolution engine (rule
  matching + shortlink chaining). Shared by the background worker and the
  audit / cycle UIs.

- **`src/shared/storage.ts`** — Wrapper around `chrome.storage` for the
  config schema (`src/shared/types.ts`).

- **`src/shared/bookmarks.ts`** — Reads/writes browser bookmarks via
  `chrome.bookmarks` for the bookmark-sync feature.

- **`src/shared/sync.ts`** + **`src/shared/google-auth.ts`** — Google Drive
  config sync. `google-auth.ts` brokers OAuth2 tokens via `chrome.identity`;
  `sync.ts` pushes / pulls the redirect config JSON.

- **`vite.config.ts`** — Declares four Rollup inputs: `popup`, `options`,
  `cycle`, `background`. Forces the background output to a stable
  `background.js` filename (the manifest references it by name). Builds are
  unminified with sourcemaps to ease debugging the loaded extension.

- **`scripts/post-build.mjs`** — Runs after `vite build`. Reads
  `public/manifest.json`, rewrites `background.service_worker`,
  `action.default_popup`, and `options_page` to match the built file paths,
  writes the result to `dist/manifest.json`, and copies icons into
  `dist/icons/`.

- **`example-config.json`** — Reference shape of a user redirect config; also
  doubles as fixture data for manual testing.

## Build & Release Flow

**Local build**

1. `npm ci` (or `npm install`) — install deps.
2. `npm run dev` — `vite build --watch` for iterative loading as an unpacked
   extension.
3. `npm run build` — production build: runs `vite build` then
   `node scripts/post-build.mjs` to produce a loadable extension in `dist/`.
4. `npm test` — runs Vitest. `npm run test:coverage` for v8 coverage.

**CI (`.github/workflows/build.yml`)**

Runs on pull requests: install deps, typecheck, test, and build to confirm
the extension still packages.

**Release (`.github/workflows/release.yml`)**

Manual `workflow_dispatch` only. Inputs: `tag` (e.g. `v1.0.0`) and `notes`.
The job checks out, installs deps, runs `npm test`, runs `npm run build`,
zips `dist/` to `release-artifacts/url-butler-<tag>.zip`, and publishes a
GitHub Release via `softprops/action-gh-release@v2` using the provided tag
and notes. Note: the release tag comes from `inputs.tag` directly — it is
**not** derived from `github.ref_name`, so dispatch can safely target any
branch.

The produced ZIP is the artifact uploaded to the Chrome Web Store (or
installed as an unpacked extension for sideloading).
