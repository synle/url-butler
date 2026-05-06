import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetChromeStorage } from './setup';
import {
  googleLogin,
  googleLogout,
  isGoogleLoggedIn,
  getGoogleEmail,
  uploadToGoogleDrive,
  downloadFromGoogleDrive,
} from '../shared/google-auth';
import type { BackupData } from '../shared/types';

beforeEach(() => {
  resetChromeStorage();
  vi.restoreAllMocks();
  chrome.runtime.lastError = null;
});

describe('googleLogin', () => {
  it('returns a token and stores it', async () => {
    chrome.identity.getAuthToken = vi.fn((_opts: unknown, cb: (token?: string) => void) => {
      cb('test-token-123');
    });

    const token = await googleLogin();
    expect(token).toBe('test-token-123');

    const loggedIn = await isGoogleLoggedIn();
    expect(loggedIn).toBe(true);
  });

  it('rejects when chrome.runtime.lastError is set', async () => {
    chrome.identity.getAuthToken = vi.fn((_opts: unknown, cb: (token?: string) => void) => {
      chrome.runtime.lastError = { message: 'User cancelled' };
      cb(undefined);
    });

    await expect(googleLogin()).rejects.toThrow('User cancelled');
    chrome.runtime.lastError = null;
  });

  it('rejects when no token returned', async () => {
    chrome.identity.getAuthToken = vi.fn((_opts: unknown, cb: (token?: string) => void) => {
      cb(undefined);
    });

    await expect(googleLogin()).rejects.toThrow('Login failed');
  });
});

describe('googleLogout', () => {
  it('clears stored token', async () => {
    resetChromeStorage({ googleToken: 'stored-token' });
    chrome.identity.removeCachedAuthToken = vi.fn((_opts: unknown, cb: () => void) => cb());

    await googleLogout();

    const loggedIn = await isGoogleLoggedIn();
    expect(loggedIn).toBe(false);
  });

  it('calls removeCachedAuthToken with stored token', async () => {
    resetChromeStorage({ googleToken: 'my-token' });
    chrome.identity.removeCachedAuthToken = vi.fn((_opts: unknown, cb: () => void) => cb());

    await googleLogout();
    expect(chrome.identity.removeCachedAuthToken).toHaveBeenCalledWith(
      { token: 'my-token' },
      expect.any(Function),
    );
  });

  it('handles missing token gracefully', async () => {
    chrome.identity.removeCachedAuthToken = vi.fn((_opts: unknown, cb: () => void) => cb());
    await googleLogout();
    // removeCachedAuthToken should not be called when there's no token
    expect(chrome.identity.removeCachedAuthToken).not.toHaveBeenCalled();
  });
});

describe('isGoogleLoggedIn', () => {
  it('returns false when no token', async () => {
    expect(await isGoogleLoggedIn()).toBe(false);
  });

  it('returns true when token exists', async () => {
    resetChromeStorage({ googleToken: 'valid-token' });
    expect(await isGoogleLoggedIn()).toBe(true);
  });
});

describe('getGoogleEmail', () => {
  it('returns null when not logged in', async () => {
    expect(await getGoogleEmail()).toBeNull();
  });

  it('returns email from Google API', async () => {
    resetChromeStorage({ googleToken: 'valid-token' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ email: 'user@gmail.com' }),
      }),
    );

    const email = await getGoogleEmail();
    expect(email).toBe('user@gmail.com');
  });

  it('returns null on API error', async () => {
    resetChromeStorage({ googleToken: 'valid-token' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false }),
    );

    expect(await getGoogleEmail()).toBeNull();
  });

  it('returns null on network failure', async () => {
    resetChromeStorage({ googleToken: 'valid-token' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    expect(await getGoogleEmail()).toBeNull();
  });

  it('returns null when email missing from response', async () => {
    resetChromeStorage({ googleToken: 'valid-token' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );

    expect(await getGoogleEmail()).toBeNull();
  });
});

describe('uploadToGoogleDrive', () => {
  const mockBackup: BackupData = {
    version: 1,
    exportedAt: '2024-01-01T00:00:00Z',
    homepage: 'https://home.com',
    configs: [['a', 'https://a.com']],
    audit: {},
    serverUrl: 'https://server.com',
  };

  it('throws when not logged in', async () => {
    await expect(uploadToGoogleDrive(mockBackup)).rejects.toThrow('Not logged in');
  });

  it('creates new file when none exists', async () => {
    resetChromeStorage({ googleToken: 'token' });
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    await uploadToGoogleDrive(mockBackup);

    // Second call should be POST (create)
    expect(mockFetch.mock.calls[1][1].method).toBe('POST');
  });

  it('updates existing file when found', async () => {
    resetChromeStorage({ googleToken: 'token' });
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'file-123' }] }),
      })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    await uploadToGoogleDrive(mockBackup);

    // Second call should be PATCH (update) with file ID in URL
    expect(mockFetch.mock.calls[1][1].method).toBe('PATCH');
    expect(mockFetch.mock.calls[1][0]).toContain('file-123');
  });

  it('throws on upload failure', async () => {
    resetChromeStorage({ googleToken: 'token' });
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ files: [] }),
        })
        .mockResolvedValueOnce({ ok: false, status: 500 }),
    );

    await expect(uploadToGoogleDrive(mockBackup)).rejects.toThrow('Drive upload failed: 500');
  });
});

describe('downloadFromGoogleDrive', () => {
  it('throws when not logged in', async () => {
    await expect(downloadFromGoogleDrive()).rejects.toThrow('Not logged in');
  });

  it('returns null when no backup file found', async () => {
    resetChromeStorage({ googleToken: 'token' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      }),
    );

    expect(await downloadFromGoogleDrive()).toBeNull();
  });

  it('downloads and returns backup data', async () => {
    resetChromeStorage({ googleToken: 'token' });
    const backupData: BackupData = {
      version: 1,
      exportedAt: '2024-01-01',
      homepage: '',
      configs: [],
      audit: {},
      serverUrl: '',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ files: [{ id: 'file-1' }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(backupData),
        }),
    );

    const result = await downloadFromGoogleDrive();
    expect(result).toEqual(backupData);
  });

  it('returns null when download request fails', async () => {
    resetChromeStorage({ googleToken: 'token' });
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ files: [{ id: 'file-1' }] }),
        })
        .mockResolvedValueOnce({ ok: false }),
    );

    expect(await downloadFromGoogleDrive()).toBeNull();
  });
});
