# url-porter

A Chrome extension for porting / managing URLs, built with Vite, React 18, TypeScript, and MUI. Bundles a watch-mode dev build that emits a loadable extension into `dist/`.

## Quick Start

Install dependencies:

```bash
npm ci || npm install --no-fund --prefer-offline
```

Run the dev build in watch mode:

```bash
npm run dev
```

Then load `dist/` as an unpacked extension at `chrome://extensions` (Developer mode on).

Production build:

```bash
npm run build
```

Tests and formatting:

```bash
npm test
npm run test:coverage
npm run format
```
