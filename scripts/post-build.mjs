/**
 * Post-build script — copies manifest.json and icons to dist/,
 * updating paths to match the Vite build output.
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = join(ROOT, 'dist');

// Read the source manifest
const manifest = JSON.parse(readFileSync(join(ROOT, 'public', 'manifest.json'), 'utf-8'));

// Update paths for built output
manifest.background.service_worker = 'background.js';
manifest.action.default_popup = 'src/popup/index.html';
manifest.options_page = 'src/options/index.html';

// Write updated manifest to dist
writeFileSync(join(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Copy icons
const iconsDir = join(DIST, 'icons');
if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });
const srcIcons = join(ROOT, 'public', 'icons');
if (existsSync(srcIcons)) {
  for (const file of readdirSync(srcIcons)) {
    copyFileSync(join(srcIcons, file), join(iconsDir, file));
  }
}

console.log('[post-build] manifest.json and icons copied to dist/');
