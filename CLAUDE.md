# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run build     # Production build → outputs to dist/ (Vite build + post-build copy)
npm run dev       # Watch mode → auto-rebuilds dist/ on file changes
npm run icons     # Regenerate placeholder icons in public/icons/
```

After building, load `dist/` as an unpacked extension in `chrome://extensions/` (Developer Mode). After rebuilds, manually refresh the extension there.

## Architecture

URL Butler is a **Chrome Extension (Manifest V3)** for managing URL redirects with shortlink chaining, built with React 18, TypeScript (strict), MUI 5, and Vite 4.

### Multi-Entry Build

Vite builds four entry points into `dist/`:

| Entry | Source | Output |
|---|---|---|
| Popup (omni searchbox) | `src/popup/index.html` | `dist/src/popup/index.html` |
| Options (settings page) | `src/options/index.html` | `dist/src/options/index.html` |
| Cycle detection page | `src/cycle/index.html` | `dist/src/cycle/index.html` |
| Background service worker | `src/background/index.ts` | `dist/background.js` |

The post-build script (`scripts/post-build.mjs`) copies `public/manifest.json` into `dist/` with corrected output paths, plus icons.

### Core Data Flow

```
Popup/Options UI  →  chrome.runtime.sendMessage()  →  Background Service Worker
                                                            ↓
                                                      src/shared/ modules
                                                            ↓
                                              chrome.storage.local + Bookmarks API
```

The background worker (`src/background/index.ts`) is the central message router. It handles four message types: `NAVIGATE`, `RESOLVE_REDIRECT`, `SYNC_SERVER`, `SYNC_BOOKMARKS`. It also intercepts `webNavigation.onBeforeNavigate` to redirect matching URLs typed in the address bar.

### Shared Logic Layer (`src/shared/`)

All business logic lives here, decoupled from React:

- **`redirect.ts`** — The redirect engine. `resolveRedirect()` follows alias chains (e.g., `gem → gemini → https://gemini.google.com/app`) using a visited-set for cycle detection. `normalizeConfig()` converts both config formats (array `["a","b"]` and object `{from,to}`) to a uniform `ConfigEntry`.
- **`storage.ts`** — Typed async wrapper over `chrome.storage.local`. `saveConfigsWithAudit()` diffs old vs new configs and records changes. Audit caps: 5000 aliases, 50 changes per alias.
- **`bookmarks.ts`** — Maintains a `url-butler` folder in Other Bookmarks. Wipes and rebuilds on every config change.
- **`sync.ts`** — Fetches remote JSON, merges with local (server wins by alias key), triggers bookmark sync.
- **`google-auth.ts`** — Optional OAuth via `chrome.identity`, uploads/downloads `url-butler-backup.json` on Google Drive.

### Options Page Tab Structure

`Options.tsx` owns all state and passes callbacks to five tab components:

1. `SettingsTab` — homepage, server URL, sync button, Google login
2. `ConfigTable` — mass-edit table with add/remove/reorder/inline-edit
3. `JsonEditor` — raw JSON textarea with validation
4. `AuditPage` — change history per alias with restore
5. `BackupRestore` — file export/import + Google Drive sync

### Config Format

Configs support two interchangeable forms stored in the same array:
```json
["alias", "https://example.com"]
{ "from": "alias", "to": "https://example.com" }
```

Aliases can chain (target is another alias rather than a URL). The redirect engine resolves chains and detects cycles. IPs and hostnames without protocol get `http://` prepended.

### Key Manifest Permissions

`storage`, `bookmarks`, `identity`, `webNavigation`, `tabs`, plus `<all_urls>` host permission. The `oauth2` section has a placeholder client ID for Google login.

## Project Conventions

- ES module project (`"type": "module"` in package.json)
- `@` import alias maps to `src/` (configured in vite.config.ts)
- No minification in build (easier debugging); sourcemaps enabled
- Build scripts use `.mjs`/`.cjs` extensions to disambiguate module format
- Each UI page has its own `index.html` + `main.tsx` bootstrap + root component
