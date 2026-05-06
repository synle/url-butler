import { describe, it, expect, beforeEach, vi } from 'vitest';
import { syncBookmarks } from '../shared/bookmarks';

beforeEach(() => {
  vi.restoreAllMocks();

  // Default: no existing folder → create triggers
  chrome.bookmarks.search = vi.fn((_q: unknown, cb: (r: unknown[]) => void) => cb([]));
  chrome.bookmarks.create = vi.fn((_props: unknown, cb?: (node: unknown) => void) => {
    cb?.({ id: 'folder-1', title: 'url-butler' });
  });
  chrome.bookmarks.getChildren = vi.fn((_id: string, cb: (c: unknown[]) => void) => cb([]));
  chrome.bookmarks.remove = vi.fn((_id: string, cb?: () => void) => cb?.());
  chrome.bookmarks.removeTree = vi.fn((_id: string, cb?: () => void) => cb?.());
  chrome.runtime.lastError = null;
});

describe('syncBookmarks', () => {
  it('creates folder and bookmarks for configs', async () => {
    await syncBookmarks([['gh', 'https://github.com']], '');
    expect(chrome.bookmarks.create).toHaveBeenCalledTimes(2); // folder + 1 bookmark
  });

  it('adds homepage bookmark when homepage is set', async () => {
    await syncBookmarks([], 'https://home.com');

    const calls = (chrome.bookmarks.create as ReturnType<typeof vi.fn>).mock.calls;
    // First call creates the folder, second creates homepage bookmark
    const homepageCall = calls.find(
      (c: unknown[]) => (c[0] as { title?: string }).title === '🏠 Homepage',
    );
    expect(homepageCall).toBeDefined();
  });

  it('skips homepage bookmark when homepage is empty', async () => {
    await syncBookmarks([], '');

    const calls = (chrome.bookmarks.create as ReturnType<typeof vi.fn>).mock.calls;
    const homepageCall = calls.find(
      (c: unknown[]) => (c[0] as { title?: string }).title === '🏠 Homepage',
    );
    expect(homepageCall).toBeUndefined();
  });

  it('reuses existing folder if found', async () => {
    chrome.bookmarks.search = vi.fn((_q: unknown, cb: (r: unknown[]) => void) => {
      cb([{ id: 'existing-folder', title: 'url-butler' }]); // No url → it's a folder
    });

    await syncBookmarks([['a', 'https://a.com']], '');

    // getChildren should be called with the existing folder id
    expect(chrome.bookmarks.getChildren).toHaveBeenCalledWith('existing-folder', expect.any(Function));
  });

  it('clears existing children before adding new ones', async () => {
    chrome.bookmarks.search = vi.fn((_q: unknown, cb: (r: unknown[]) => void) => {
      cb([{ id: 'f1', title: 'url-butler' }]);
    });
    chrome.bookmarks.getChildren = vi.fn((_id: string, cb: (c: unknown[]) => void) => {
      cb([
        { id: 'child1', url: 'https://old.com' },
        { id: 'child2', url: 'https://old2.com' },
      ]);
    });

    await syncBookmarks([['new', 'https://new.com']], '');
    expect(chrome.bookmarks.remove).toHaveBeenCalledTimes(2);
  });

  it('does not throw on error (logs instead)', async () => {
    chrome.bookmarks.search = vi.fn(() => {
      throw new Error('Bookmarks API unavailable');
    });
    // Should not throw
    await expect(syncBookmarks([], '')).resolves.toBeUndefined();
  });

  it('handles object config format', async () => {
    await syncBookmarks([{ from: 'test', to: 'https://test.com' }], '');
    const calls = (chrome.bookmarks.create as ReturnType<typeof vi.fn>).mock.calls;
    const bookmarkCall = calls.find(
      (c: unknown[]) => (c[0] as { title?: string }).title === 'test',
    );
    expect(bookmarkCall).toBeDefined();
  });

  it('ensures protocol on bookmark URLs', async () => {
    await syncBookmarks([['local', 'myserver.local']], '');
    const calls = (chrome.bookmarks.create as ReturnType<typeof vi.fn>).mock.calls;
    const bookmarkCall = calls.find(
      (c: unknown[]) => (c[0] as { title?: string }).title === 'local',
    );
    expect((bookmarkCall![0] as { url?: string }).url).toBe('http://myserver.local');
  });
});
