import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetChromeStorage } from './setup';
import { syncFromServer } from '../shared/sync';

beforeEach(() => {
  resetChromeStorage({
    serverUrl: 'https://example.com/config.json',
    configs: [['local', 'https://local.com']],
    homepage: 'https://local-home.com',
    audit: {},
  });
  vi.restoreAllMocks();

  // Reset bookmark mocks
  chrome.bookmarks.search = vi.fn((_q: unknown, cb: (r: unknown[]) => void) => cb([]));
  chrome.bookmarks.create = vi.fn((_props: unknown, cb?: (node: unknown) => void) => {
    cb?.({ id: 'f1', title: 'url-butler' });
  });
  chrome.bookmarks.getChildren = vi.fn((_id: string, cb: (c: unknown[]) => void) => cb([]));
  chrome.bookmarks.remove = vi.fn((_id: string, cb?: () => void) => cb?.());
  chrome.bookmarks.removeTree = vi.fn((_id: string, cb?: () => void) => cb?.());
  chrome.runtime.lastError = null;
});

describe('syncFromServer', () => {
  it('merges server configs with local, server wins', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            homepage: 'https://server-home.com',
            configs: [['local', 'https://server-override.com'], ['remote', 'https://remote.com']],
          }),
      }),
    );

    const result = await syncFromServer();

    expect(result.homepage).toBe('https://server-home.com');
    // local alias should be overridden by server value
    const configs = result.configs;
    expect(configs).toHaveLength(2);
  });

  it('uses explicit serverUrl parameter over stored one', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ configs: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await syncFromServer('https://custom-url.com/data.json');
    expect(mockFetch).toHaveBeenCalledWith('https://custom-url.com/data.json');
  });

  it('throws on empty server URL', async () => {
    resetChromeStorage({ serverUrl: '' });
    await expect(syncFromServer()).rejects.toThrow('No server URL configured');
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    await expect(syncFromServer()).rejects.toThrow('Server returned 404');
  });

  it('keeps local homepage when server has none', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ configs: [] }),
      }),
    );

    const result = await syncFromServer();
    expect(result.homepage).toBe('https://local-home.com');
  });

  it('keeps local configs when server has none', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );

    const result = await syncFromServer();
    expect(result.configs.length).toBeGreaterThanOrEqual(1);
  });

  it('deduplicates configs by alias (case-insensitive)', async () => {
    resetChromeStorage({
      serverUrl: 'https://example.com/config.json',
      configs: [['MyAlias', 'https://old.com']],
      homepage: '',
      audit: {},
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            configs: [['myalias', 'https://new.com']],
          }),
      }),
    );

    const result = await syncFromServer();
    // Should only have 1 config (server wins over local for same alias)
    expect(result.configs).toHaveLength(1);
  });
});
