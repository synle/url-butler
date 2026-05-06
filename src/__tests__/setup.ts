/**
 * Vitest setup — mocks for Chrome extension APIs.
 *
 * Provides a minimal in-memory implementation of chrome.storage.local,
 * chrome.bookmarks, chrome.identity, and chrome.runtime so that
 * shared/ modules can be unit-tested without a real browser.
 */

import { vi } from 'vitest';

// In-memory store for chrome.storage.local
let storageData: Record<string, unknown> = {};

export function resetChromeStorage(initial: Record<string, unknown> = {}) {
  storageData = { ...initial };
}

const chromeStorageLocal = {
  get: vi.fn((defaults: Record<string, unknown>, cb: (result: Record<string, unknown>) => void) => {
    const merged = { ...defaults };
    for (const key of Object.keys(defaults)) {
      if (key in storageData) {
        merged[key] = storageData[key];
      }
    }
    cb(merged);
  }),
  set: vi.fn((data: Record<string, unknown>, cb?: () => void) => {
    Object.assign(storageData, data);
    cb?.();
  }),
};

const chromeBookmarks = {
  search: vi.fn((_query: unknown, cb: (results: unknown[]) => void) => cb([])),
  create: vi.fn((_props: unknown, cb?: (node: unknown) => void) => {
    cb?.({ id: String(Math.random()), title: '', url: '' });
  }),
  getChildren: vi.fn((_id: string, cb: (children: unknown[]) => void) => cb([])),
  remove: vi.fn((_id: string, cb?: () => void) => cb?.()),
  removeTree: vi.fn((_id: string, cb?: () => void) => cb?.()),
};

const chromeIdentity = {
  getAuthToken: vi.fn((_opts: unknown, cb: (token?: string) => void) => cb('mock-token')),
  removeCachedAuthToken: vi.fn((_opts: unknown, cb: () => void) => cb()),
};

const chromeRuntime = {
  lastError: null as { message: string } | null,
  getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
};

// Attach to globalThis so modules importing `chrome.*` work.
Object.defineProperty(globalThis, 'chrome', {
  value: {
    storage: { local: chromeStorageLocal },
    bookmarks: chromeBookmarks,
    identity: chromeIdentity,
    runtime: chromeRuntime,
  },
  writable: true,
});
