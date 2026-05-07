#!/usr/bin/env bash
# Format JS/TS sources with Prettier.
set -euo pipefail
cd "$(dirname "$0")"
npx --yes prettier@3.3.3 --write \
  'src/**/*.{ts,tsx,js,jsx,json,css,html}' \
  'scripts/**/*.{js,mjs,cjs,ts}' \
  '*.{json,md}'
