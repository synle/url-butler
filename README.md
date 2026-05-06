# URL Butler — Chrome Extension

A Chrome Extension for managing URL redirects, shortlink chaining, bookmark syncing, and more. Built with **Manifest V3**, **React**, **TypeScript**, **Material-UI**, and **Vite**.

---

## Features

| Feature | Description |
|---|---|
| **Shortlink Redirects** | Type an alias (e.g., `drive`) and get redirected to the full URL |
| **Chained Redirects** | `ezreceipt` → `wagework` → `https://participant.wageworks.com` |
| **Cycle Detection** | Detects `a → b → a` loops and shows a detailed error page |
| **Omni Searchbox** | Popup with autocomplete over all your aliases |
| **Bookmark Sync** | Configs auto-sync to a `url-butler` Chrome bookmark folder |
| **Server Sync** | Fetch & merge configs from a remote JSON URL |
| **Mass Edit Table** | Add/remove/reorder redirects in a table UI |
| **Raw JSON Editor** | Edit configs directly as JSON with validation |
| **Audit History** | Track all changes (max 50 per alias, 5000 aliases) |
| **Backup/Restore** | Export/import all data as JSON files |
| **Google Login** | Optional OAuth login for Google Drive cloud sync |

---

## Local Development Setup (Step-by-Step)

### Prerequisites

Before you start, make sure you have these installed on your machine:

| Tool | Minimum Version | How to check | How to install |
|---|---|---|---|
| **Node.js** | 16.0+ | `node --version` | [nodejs.org](https://nodejs.org/) or `brew install node` (macOS) |
| **npm** | 8.0+ (comes with Node) | `npm --version` | Installed automatically with Node.js |
| **Google Chrome** | Any recent version | Open Chrome → `chrome://version/` | [google.com/chrome](https://www.google.com/chrome/) |
| **Git** (optional) | Any | `git --version` | `brew install git` (macOS) or [git-scm.com](https://git-scm.com/) |

### Step 1: Get the Source Code

**Option A — Clone with Git:**
```bash
git clone <your-repo-url> url-butler
cd url-butler
```

**Option B — Download manually:**
Download the project folder and open a terminal inside it:
```bash
cd /path/to/url-butler
```

Verify you're in the right directory:
```bash
ls package.json
# Should print: package.json
```

### Step 2: Install Dependencies

```bash
npm install
```

This downloads React, MUI, Vite, TypeScript, and all other packages into `node_modules/`. It takes about 30 seconds on a typical connection.

**Expected output** (last few lines):
```
added 400+ packages in 30s
```

If you see permission errors, try:
```bash
sudo npm install    # macOS/Linux
```

### Step 3: Build the Extension

```bash
npm run build
```

This does two things:
1. **Vite** compiles all TypeScript/React source files into optimized JavaScript bundles in `dist/`.
2. **post-build script** copies `manifest.json` and icon files into `dist/` with corrected paths.

**Expected output:**
```
vite v4.x.x building for production...
✓ 960 modules transformed.
dist/src/popup/index.html       0.73 kB
dist/src/options/index.html     0.70 kB
dist/src/cycle/index.html       0.56 kB
dist/background.js              2.97 kB
...
✓ built in ~2s
[post-build] manifest.json and icons copied to dist/
```

After this step, the `dist/` folder is a complete, loadable Chrome Extension.

### Step 4: Load into Chrome

1. Open Chrome and navigate to:
   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode** — toggle the switch in the **top-right corner** of the page.

   > You should see new buttons appear: "Load unpacked", "Pack extension", and "Update".

3. Click **"Load unpacked"**.

4. In the file picker, navigate to your project folder and **select the `dist/` folder**:
   ```
   url-butler/
     └── dist/    <── select this folder
   ```

5. The extension should now appear in your extensions list with the name **"URL Butler"**.

6. **Pin the extension** (optional but recommended):
   - Click the puzzle piece icon (Extensions) in the Chrome toolbar.
   - Find "URL Butler" and click the pin icon next to it.
   - The URL Butler icon now appears in your toolbar for quick access.

### Step 5: Verify It Works

1. **Click the URL Butler icon** in the toolbar — the popup should open with a search box.

2. **Open the Settings page**:
   - Click the gear icon in the popup, OR
   - Right-click the extension icon → "Options", OR
   - On `chrome://extensions/`, click "Details" on URL Butler → "Extension options".

3. **Sync from server**:
   - On the Settings tab, the server URL should already be set to:
     ```
     https://raw.githubusercontent.com/synle/fav/refs/heads/main/url-porter.json
     ```
   - Click **"Sync from Server"** — this fetches your config and populates all shortcuts.

4. **Test a redirect**:
   - Click the URL Butler popup icon.
   - Type `drive` and press Enter — Chrome should navigate to `https://drive.google.com`.
   - Type `gem` — it should chain-resolve `gem → gemini → https://gemini.google.com/app`.

5. **Check bookmarks**:
   - Open Chrome Bookmarks Manager (`Ctrl+Shift+O` / `Cmd+Shift+O`).
   - Look under "Other Bookmarks" — you should see a folder called **"url-butler"** with all your shortcuts.

### Step 6: Development Mode (Live Rebuild)

For active development, use watch mode so Vite rebuilds automatically when you edit source files:

```bash
npm run dev
```

This runs `vite build --watch`. When you save a file:
1. Vite detects the change and rebuilds `dist/` automatically.
2. Go to `chrome://extensions/` and click the **refresh icon** (circular arrow) on the URL Butler card.
3. Your changes are now live.

> **Note:** After rebuilding, you must manually refresh the extension in Chrome. Chrome does not auto-reload unpacked extensions.

**Workflow summary:**
```
Edit source file → Vite auto-rebuilds dist/ → Refresh extension in Chrome → Test
```

### Step 7: Rebuilding After Changes

If you stopped the dev server and want to do a one-time build:

```bash
npm run build
```

Then refresh the extension in `chrome://extensions/`.

---

### Troubleshooting

| Problem | Solution |
|---|---|
| `npm install` fails with permission errors | Run `sudo npm install` or fix npm permissions ([guide](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally)) |
| `npm run build` shows `crypto` error | Your Node.js is too old. Upgrade to Node 16+ (`node --version` to check) |
| Extension doesn't appear after "Load unpacked" | Make sure you selected the `dist/` folder, not the project root |
| Popup is blank / shows errors | Open `chrome://extensions/`, click "Errors" on URL Butler, check the console |
| "Service worker registration failed" | Rebuild with `npm run build` and refresh. The background script path might be stale |
| Changes not reflected after editing code | Rebuild (`npm run build` or use `npm run dev`) then refresh the extension in `chrome://extensions/` |
| Server sync fails | Check your internet connection. Verify the server URL returns valid JSON by opening it in a browser |
| Bookmarks not syncing | Make sure the "bookmarks" permission is granted. Check `chrome://extensions/` → URL Butler → Details → Permissions |

### npm Scripts Reference

| Command | Description |
|---|---|
| `npm run build` | Production build → outputs to `dist/` ready for Chrome |
| `npm run dev` | Watch mode → auto-rebuilds on file changes |
| `npm run icons` | Regenerate placeholder icons in `public/icons/` |

---

## Folder Structure

```
url-butler/
├── public/
│   ├── manifest.json          # Chrome Extension manifest (source)
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── src/
│   ├── background/
│   │   └── index.ts           # Service worker: redirect logic, message handling
│   ├── popup/
│   │   ├── index.html         # Popup entry HTML
│   │   ├── main.tsx           # Popup React bootstrap
│   │   └── Popup.tsx          # Omni searchbox UI
│   ├── options/
│   │   ├── index.html         # Options page entry HTML
│   │   ├── main.tsx           # Options React bootstrap
│   │   └── Options.tsx        # Main settings page with tabs
│   ├── cycle/
│   │   ├── index.html         # Cycle detection page entry HTML
│   │   ├── main.tsx           # Cycle page React bootstrap
│   │   └── CycleDetection.tsx # Cycle error display
│   ├── components/
│   │   ├── SettingsTab.tsx     # Homepage, server URL, Google login
│   │   ├── ConfigTable.tsx     # Mass edit table view
│   │   ├── JsonEditor.tsx      # Raw JSON config editor
│   │   ├── AuditPage.tsx       # Change history + restore
│   │   └── BackupRestore.tsx   # Export/import/Google Drive sync
│   └── shared/
│       ├── types.ts            # TypeScript type definitions
│       ├── storage.ts          # chrome.storage.local wrapper + audit
│       ├── redirect.ts         # Redirect resolution + cycle detection
│       ├── bookmarks.ts        # Bookmark folder sync
│       ├── sync.ts             # Server fetch + merge
│       └── google-auth.ts      # Google OAuth + Drive backup
├── scripts/
│   ├── post-build.mjs         # Copies manifest + icons to dist/
│   └── create-icons.cjs       # Generates placeholder icons
├── dist/                       # Built extension (load this in Chrome)
├── vite.config.ts              # Vite build configuration
├── tsconfig.json               # TypeScript configuration
├── package.json
└── README.md
```

---

## Architecture Overview (For Beginners)

### How the Pieces Fit Together

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CHROME BROWSER                               │
│                                                                     │
│  ┌──────────────┐    message     ┌──────────────────────────────┐   │
│  │   POPUP      │──────────────→ │   BACKGROUND SERVICE WORKER  │   │
│  │  (search &   │  "NAVIGATE"    │   src/background/index.ts    │   │
│  │   navigate)  │                │                              │   │
│  │              │  ┌─────────────│  • Receives messages          │   │
│  │  Popup.tsx   │  │ resolved    │  • Resolves redirect chains   │   │
│  │              │←─┘ result      │  • Navigates the tab          │   │
│  └──────────────┘                │  • Intercepts address bar     │   │
│                                  │  • Auto-syncs on install      │   │
│  ┌──────────────┐                │                              │   │
│  │   OPTIONS    │  save/load     │         Uses:                │   │
│  │  (settings   │←──────────────→│  ┌────────────────────────┐  │   │
│  │   page)      │  configs       │  │   SHARED MODULES       │  │   │
│  │              │                │  │                        │  │   │
│  │  Options.tsx │                │  │  redirect.ts  →resolve │  │   │
│  │  ConfigTable │                │  │  storage.ts   →save    │  │   │
│  │  JsonEditor  │                │  │  bookmarks.ts →sync    │  │   │
│  │  AuditPage   │                │  │  sync.ts      →fetch   │  │   │
│  │  BackupRest. │                │  │  google-auth  →OAuth   │  │   │
│  └──────────────┘                │  └────────────────────────┘  │   │
│                                  └──────────────────────────────┘   │
│  ┌──────────────┐                                                   │
│  │  CYCLE PAGE  │  ← opened when a redirect loop is detected       │
│  │  CycleDetec. │                                                   │
│  └──────────────┘                                                   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  CHROME STORAGE (chrome.storage.local)                       │   │
│  │  configs, homepage, audit history, server URL, google token  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
         ▲                                           ▲
         │ fetch JSON                                │ backup/restore
         ▼                                           ▼
   ┌───────────┐                              ┌──────────────┐
   │  REMOTE   │                              │ GOOGLE DRIVE │
   │  SERVER   │                              │  (optional)  │
   └───────────┘                              └──────────────┘
```

### Code Entry Points — Where to Start Reading

If you're new to the codebase, here's the recommended reading order:

**1. Start here — understand the data shape:**
```
src/shared/types.ts          ← All TypeScript interfaces (ConfigItem, StorageData, etc.)
```
This tiny file defines every data structure used across the project. Read it first.

**2. Core logic — how redirects work:**
```
src/shared/redirect.ts       ← resolveRedirect() and detectAllCycles()
```
This is the heart of the extension. Follow `resolveRedirect()` to see how `gem → gemini → https://gemini.google.com/app` gets resolved step by step.

**3. Where everything kicks off at runtime:**
```
src/background/index.ts      ← The service worker (always running in the background)
```
This is the "main" of the extension. It listens for messages from the popup/options pages and handles all navigation. Start reading from the `chrome.runtime.onMessage.addListener(...)` call.

**4. What the user sees:**
```
src/popup/Popup.tsx           ← The small search box when you click the extension icon
src/options/Options.tsx       ← The full settings page (tabs: Settings, Table, JSON, Audit, Backup)
```

**5. Data layer:**
```
src/shared/storage.ts         ← Read/write configs to Chrome storage + audit tracking
src/shared/bookmarks.ts       ← Sync configs into a Chrome bookmark folder
src/shared/sync.ts            ← Fetch configs from a remote server URL
```

### End-to-End Walkthrough: What Happens When You Type "gem"

```
 YOU type "gem" in the popup search box and press Enter
  │
  ▼
 Popup.tsx sends a message to the background:
   chrome.runtime.sendMessage({ type: "NAVIGATE", query: "gem" })
  │
  ▼
 background/index.ts receives the message
  │
  ▼
 Calls resolveRedirect("gem", configMap) from redirect.ts
  │
  ├──→ Look up "gem" in configMap → found: "gemini"
  │    (not a URL, keep resolving)
  │
  ├──→ Look up "gemini" in configMap → found: "https://gemini.google.com/app"
  │    (starts with https:// → it's a URL, stop!)
  │
  ├──→ Check for cycles → visited set: {gem, gemini} → no repeats → OK
  │
  └──→ Return { destination: "https://gemini.google.com/app",
  │             chain: ["gem", "gemini"],
  │             isCycle: false }
  │
  ▼
 background/index.ts calls:
   chrome.tabs.update(tabId, { url: "https://gemini.google.com/app" })
  │
  ▼
 Chrome navigates to https://gemini.google.com/app ✓
```

### Message Types (How Parts Communicate)

The popup and options pages talk to the background service worker via `chrome.runtime.sendMessage`:

| Message Type | Sent From | What It Does |
|---|---|---|
| `NAVIGATE` | Popup | Resolve a query and navigate the current tab |
| `RESOLVE_REDIRECT` | Popup | Resolve a query and return the result (for preview) |
| `SYNC_SERVER` | Options | Fetch configs from the remote server URL |
| `SYNC_BOOKMARKS` | Options | Rebuild the Chrome bookmark folder from configs |

---

## Module Reference

### `src/shared/types.ts`
All TypeScript interfaces: `ConfigItem`, `ConfigEntry`, `AuditHistory`, `StorageData`, `BackupData`, etc.

### `src/shared/redirect.ts`
- `normalizeConfig(item)` — Converts `["a","b"]` or `{from:"a",to:"b"}` to `{from,to}`.
- `resolveRedirect(query, configMap)` — Follows the shortlink chain. Returns `{destination, chain, isCycle}`.
- `detectAllCycles(configMap)` — Scans all configs for cycles.

### `src/shared/storage.ts`
- `getStorage()` / `setStorage(partial)` — Typed chrome.storage.local access.
- `getConfigMap()` — Builds a `Map<alias, target>` from stored configs.
- `saveConfigsWithAudit(configs)` — Saves configs and records audit diffs.
- `recordAudit(alias, oldTo, newTo)` — Appends an audit change (capped at 50/alias).

### `src/shared/bookmarks.ts`
- `syncBookmarks(configs, homepage)` — Wipes and rebuilds the `url-butler` bookmark folder.

### `src/shared/sync.ts`
- `syncFromServer(url?)` — Fetches JSON from server, merges with local, syncs bookmarks.

### `src/shared/google-auth.ts`
- `googleLogin()` / `googleLogout()` — Chrome identity OAuth flow.
- `uploadToGoogleDrive(backup)` / `downloadFromGoogleDrive()` — Drive file sync.

### `src/background/index.ts`
- Handles `NAVIGATE`, `RESOLVE_REDIRECT`, `SYNC_SERVER`, `SYNC_BOOKMARKS` messages.
- Listens to `webNavigation.onBeforeNavigate` to intercept matching URLs.
- Runs initial server sync on extension install.

---

## Config Format

Configs can be in two forms:

```json
// Array form
["drive", "https://drive.google.com"]

// Object form
{ "from": "gleanchat", "to": "http://app.glean.com/chat" }
```

### Chained Redirects

```json
["ezreceipt", "wagework"],
["wagework", "https://participant.wageworks.com"]
```

Typing `ezreceipt` → resolves to `wagework` → resolves to `https://participant.wageworks.com`

### Server JSON Format

```json
{
  "homepage": "https://synle.github.io/fav/",
  "configs": [
    ["drive", "https://drive.google.com"],
    { "from": "gleanchat", "to": "http://app.glean.com/chat" }
  ]
}
```

Default server URL: `https://raw.githubusercontent.com/synle/fav/refs/heads/main/url-porter.json`

---

## How It Works

### Redirect Flow

```
User types "ezreceipt" in popup
  │
  ├─ Lookup "ezreceipt" in config map
  │   → found: "wagework"
  │
  ├─ Lookup "wagework" in config map
  │   → found: "https://participant.wageworks.com"
  │
  ├─ "https://..." is a URL → stop resolving
  │
  └─ Navigate to https://participant.wageworks.com
```

### Cycle Detection Flow

```
Config: a → b, b → a

Resolve "a":
  visited = {a}
  a → b (not visited, add b)
  visited = {a, b}
  b → a (already visited!)
  → CYCLE DETECTED
  → Open cycle-detection.html with chain: [a, b, a]
```

### Storage Flow

```
User edits configs
  │
  ├─ Diff against old configs → record audit changes
  ├─ Save to chrome.storage.local
  ├─ Sync to bookmarks (url-butler folder)
  └─ Update homepage
```

---

## Google OAuth Setup (Optional)

To enable Google login and Drive sync:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable the **Google Drive API**
3. Create an **OAuth 2.0 Client ID** for a Chrome Extension
4. Set the Chrome Extension ID in the allowed origins
5. Replace `YOUR_GOOGLE_CLIENT_ID` in `public/manifest.json`

---

## Publishing to the Chrome Web Store

### Prerequisites

| Requirement | Details |
|---|---|
| **Google Developer account** | One-time $5 registration fee |
| **Production icons** | 128x128 PNG (extension icon) + 1280x800 or 640x400 PNG (store screenshots) |
| **Production build** | Minified, no sourcemaps, clean dist/ |

### Step 1: Register as a Chrome Web Store Developer

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Sign in with your Google account.
3. Pay the one-time **$5 registration fee** if you haven't already.
4. Accept the developer agreement.

### Step 2: Prepare a Production Build

The current build has minification disabled and sourcemaps enabled for development. For the store, create a production-optimized build:

1. **Update `vite.config.ts`** for production:
   ```ts
   // Change these two lines:
   minify: true,       // was: false
   sourcemap: false,    // was: true
   ```

2. **Bump the version** in `public/manifest.json` (the store requires a new version for every upload):
   ```json
   "version": "1.0.0"
   ```
   The version must follow `"major.minor.patch"` format (e.g., `"1.0.1"`, `"1.1.0"`, `"2.0.0"`).

3. **Replace placeholder icons** — the current icons in `public/icons/` are solid-blue dev placeholders. Design proper icons:
   - `icon16.png` — 16x16 (toolbar)
   - `icon48.png` — 48x48 (extensions page)
   - `icon128.png` — 128x128 (Chrome Web Store listing + install dialog)

4. **Handle the Google OAuth client ID** — if you want Google login to work for published users:
   - Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
   - Create an OAuth 2.0 Client ID of type **Chrome Extension**.
   - Set the **Item ID** to your Chrome Web Store extension ID (you get this after the first upload).
   - Replace `YOUR_GOOGLE_CLIENT_ID` in `public/manifest.json`.
   - If you don't need Google login, remove the `"oauth2"` block and the `"identity"` permission from the manifest to simplify the review process.

5. **Review permissions** — Chrome Web Store reviewers scrutinize permissions. The current manifest requests:
   - `storage`, `bookmarks` — clearly needed.
   - `webNavigation`, `tabs` — needed for redirect interception.
   - `identity` — only needed for Google login. Remove if unused.
   - `<all_urls>` host permission — triggers an extra review. Add a justification in your store listing description explaining that the extension needs to intercept navigation to resolve shortlinks.

6. **Build and zip**:
   ```bash
   npm run build

   # Create a zip of the dist/ folder
   cd dist
   zip -r ../url-butler.zip .
   cd ..
   ```
   The resulting `url-butler.zip` is what you upload to the Chrome Web Store.

### Step 3: Upload to the Chrome Web Store

1. Go to the [Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Click **"New Item"**.
3. Upload `url-butler.zip`.
4. Fill in the store listing:

   | Field | Suggested value |
   |---|---|
   | **Name** | URL Butler |
   | **Summary** (132 chars max) | Manage URL redirects with shortlink chaining, bookmark sync, and omni search. |
   | **Description** | Detailed feature list — redirects, chaining, cycle detection, server sync, backup/restore, etc. |
   | **Category** | Productivity |
   | **Language** | English |

5. **Upload promotional images** (required):
   - At least one screenshot: **1280x800** or **640x400** PNG/JPG.
   - Take screenshots of: the popup searchbox, the settings table view, the JSON editor, the cycle detection page.
   - Optional: a 440x280 small promo tile.

6. **Privacy practices**:
   - You'll be asked what data the extension collects. URL Butler stores data locally in `chrome.storage.local`. If Google login is enabled, it accesses the user's email and Drive.
   - Provide a privacy policy URL if required (needed if you use `identity` permission).
   - Select "This extension does not collect or transmit user data" if you've removed the Google login feature, or describe the Drive sync if included.

7. **Declare permissions justification**:
   - `<all_urls>`: "Required to intercept navigation events and redirect matching shortlink aliases to their configured target URLs."
   - `bookmarks`: "Required to sync redirect shortcuts to a dedicated Chrome bookmarks folder."
   - `identity` (if kept): "Required for optional Google account login to enable cross-device backup via Google Drive."

### Step 4: Submit for Review

1. Click **"Submit for Review"**.
2. Review typically takes **1-3 business days** (can take longer for extensions with broad permissions like `<all_urls>`).
3. You'll receive an email when the review is complete.
4. If rejected, read the rejection reason carefully — common issues:
   - Missing privacy policy (required for `identity` and `<all_urls>` permissions).
   - Overly broad permissions without justification.
   - Missing or low-quality screenshots.

### Step 5: After Publishing

- **Updates**: Bump the `"version"` in `public/manifest.json`, rebuild, re-zip, and upload the new zip on the Developer Dashboard. Each update goes through review again.
- **Auto-update**: Once published, Chrome automatically updates installed extensions when you publish a new version.
- **Monitoring**: The Developer Dashboard shows install counts, ratings, and any reported issues.

### Publishing Checklist

```
[ ] Developer account registered ($5 fee paid)
[ ] vite.config.ts: minify: true, sourcemap: false
[ ] public/manifest.json: version bumped
[ ] public/manifest.json: oauth2.client_id set (or oauth2 block removed)
[ ] public/icons/: proper 16, 48, 128px icons designed
[ ] npm run build: completes without errors
[ ] dist/ zipped: zip -r url-butler.zip . (from inside dist/)
[ ] Store listing: name, summary, description filled in
[ ] Screenshots: at least one 1280x800 or 640x400 image uploaded
[ ] Privacy policy: URL provided (if using identity permission)
[ ] Permission justifications: written for all permissions
[ ] Submitted for review
```

### Publishing Flow Diagram

```
Prepare Build                Upload & Configure              Review & Launch
─────────────                ──────────────────              ──────────────

vite.config.ts               Developer Dashboard             Submit for
  minify: true ──┐           ┌─────────────────┐             Review
  sourcemap: false│           │                 │               │
                  │           │  New Item        │               ▼
manifest.json     │           │  ┌───────────┐  │          1-3 business
  bump version ───┤           │  │ Upload     │  │            days
  set client_id   │           │  │ .zip file  │  │               │
                  │           │  └─────┬──────┘  │               ▼
icons/            │           │        │         │          ┌─────────┐
  16, 48, 128 ────┤           │        ▼         │          │Approved?│
                  │           │  Fill listing:   │          └────┬────┘
npm run build ────┤           │  - Name          │               │
                  │           │  - Description   │          Yes  │  No
cd dist/ ─────────┤           │  - Category      │           │   │
zip -r .. .zip ───┘           │  - Screenshots   │           │   ▼
       │                      │  - Privacy       │           │  Fix issues
       │    url-butler.zip    │  - Permissions   │           │  re-submit
       └─────────────────────>│    justification │           │
                              └──────────────────┘           ▼
                                                         Published!
                                                         Chrome auto-
                                                         updates users
```

---

## Adding New Features

### Adding a new settings tab

1. Create a component in `src/components/MyNewTab.tsx`
2. Import it in `src/options/Options.tsx`
3. Add a `<Tab label="My Tab" />` and `<TabPanel>` entry

### Adding a new redirect capability

1. Modify `resolveRedirect()` in `src/shared/redirect.ts`
2. Test cycle detection still works with `detectAllCycles()`

### Adding a new storage field

1. Add the field to `StorageData` in `src/shared/types.ts`
2. Add a default value in `DEFAULTS` in `src/shared/storage.ts`
3. Add to `BackupData` if it should be exported

---

## Example Test Config

Save this as your server JSON or paste into the JSON editor:

```json
{
  "homepage": "https://synle.github.io/fav/",
  "configs": [
    ["drive", "https://drive.google.com"],
    ["calendar", "https://calendar.google.com"],
    ["gmail", "https://mail.google.com/mail/u/0/#inbox"],
    ["outlook", "https://outlook.office.com"],
    ["plex", "192.168.1.22:32400/web/index.html"],
    ["jf", "192.168.1.22:8096"],
    ["jellyfin", "jf"],
    ["edx", "https://edstem.org/us/dashboard"],
    ["canvas", "https://utexas.instructure.com"],
    ["wagework", "https://participant.wageworks.com"],
    ["hn", "https://news.ycombinator.com"],
    ["chat", "https://chatgpt.com"],
    ["gpt", "https://chatgpt.com"],
    ["keep", "https://keep.google.com/#home"],
    ["zillow", "https://www.zillow.com"],
    ["tplinkwifi.net", "192.168.1.1"],
    ["tplinkwifi", "tplinkwifi.net"],
    ["googlefi", "https://fi.google.com/account"],
    ["fi", "googlefi"],
    ["appscript", "https://script.google.com"],
    ["script", "appscript"],
    ["fav", "https://synle.github.io/fav"],
    ["gemini", "https://gemini.google.com/app"],
    ["gem", "gemini"],
    ["azure", "portal.azure.com"],
    ["ezreceipt", "wagework"],
    ["slickdeals", "https://slickdeals.net"],
    ["dealnews", "https://www.dealnews.com"],
    ["bashrc", "https://synle.github.io/bashrc/dist/index.html"],
    { "from": "||glean^", "to": "http://app.glean.com" },
    { "from": "||gleanchat^", "to": "http://app.glean.com/chat" }
  ]
}
```

### Chained redirect examples from this config:

| You type | Chain | Final destination |
|---|---|---|
| `drive` | drive | https://drive.google.com |
| `jellyfin` | jellyfin → jf | http://192.168.1.22:8096 |
| `fi` | fi → googlefi | https://fi.google.com/account |
| `script` | script → appscript | https://script.google.com |
| `tplinkwifi` | tplinkwifi → tplinkwifi.net | http://192.168.1.1 |
| `gem` | gem → gemini | https://gemini.google.com/app |
| `ezreceipt` | ezreceipt → wagework | https://participant.wageworks.com |

---

## License

MIT
