import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetChromeStorage } from './setup';
import { getStorage, setStorage, getConfigMap, recordAudit, saveConfigsWithAudit } from '../shared/storage';

beforeEach(() => {
  resetChromeStorage();
  vi.restoreAllMocks();
});

describe('getStorage', () => {
  it('returns defaults when storage is empty', async () => {
    const data = await getStorage();
    expect(data.homepage).toBe('');
    expect(data.configs).toEqual([]);
    expect(data.audit).toEqual({});
    expect(data.serverUrl).toContain('url-porter.json');
  });

  it('returns stored values when they exist', async () => {
    resetChromeStorage({ homepage: 'https://home.com', configs: [['a', 'b']] });
    const data = await getStorage();
    expect(data.homepage).toBe('https://home.com');
    expect(data.configs).toEqual([['a', 'b']]);
  });
});

describe('setStorage', () => {
  it('persists partial updates', async () => {
    await setStorage({ homepage: 'https://new.com' });
    const data = await getStorage();
    expect(data.homepage).toBe('https://new.com');
  });

  it('does not overwrite unrelated keys', async () => {
    resetChromeStorage({ homepage: 'https://keep.com' });
    await setStorage({ serverUrl: 'https://server.com' });
    const data = await getStorage();
    expect(data.homepage).toBe('https://keep.com');
    expect(data.serverUrl).toBe('https://server.com');
  });
});

describe('getConfigMap', () => {
  it('returns empty map when no configs', async () => {
    const map = await getConfigMap();
    expect(map.size).toBe(0);
  });

  it('builds map from array configs', async () => {
    resetChromeStorage({ configs: [['Google', 'https://google.com']] });
    const map = await getConfigMap();
    expect(map.get('google')).toBe('https://google.com');
  });

  it('builds map from object configs', async () => {
    resetChromeStorage({ configs: [{ from: 'GH', to: 'https://github.com' }] });
    const map = await getConfigMap();
    expect(map.get('gh')).toBe('https://github.com');
  });

  it('lowercases keys', async () => {
    resetChromeStorage({ configs: [['MyAlias', 'https://example.com']] });
    const map = await getConfigMap();
    expect(map.has('myalias')).toBe(true);
    expect(map.has('MyAlias')).toBe(false);
  });
});

describe('recordAudit', () => {
  it('creates a new audit entry', async () => {
    await recordAudit('test', '', 'https://new.com');
    const { audit } = await getStorage();
    expect(audit['test']).toHaveLength(1);
    expect(audit['test'][0].oldTo).toBe('');
    expect(audit['test'][0].newTo).toBe('https://new.com');
  });

  it('appends to existing audit entry', async () => {
    await recordAudit('test', '', 'https://v1.com');
    await recordAudit('test', 'https://v1.com', 'https://v2.com');
    const { audit } = await getStorage();
    expect(audit['test']).toHaveLength(2);
  });

  it('lowercases the alias key', async () => {
    await recordAudit('MyAlias', '', 'https://new.com');
    const { audit } = await getStorage();
    expect(audit['myalias']).toBeDefined();
    expect(audit['MyAlias']).toBeUndefined();
  });

  it('caps at 50 changes per alias', async () => {
    for (let i = 0; i < 55; i++) {
      await recordAudit('busy', `old-${i}`, `new-${i}`);
    }
    const { audit } = await getStorage();
    expect(audit['busy']).toHaveLength(50);
    // Keeps the most recent
    expect(audit['busy'][49].newTo).toBe('new-54');
  });

  it('evicts oldest alias when alias count exceeds 5000', async () => {
    // Prepopulate with 5000 aliases
    const audit: Record<string, { timestamp: number; oldTo: string; newTo: string }[]> = {};
    for (let i = 0; i < 5000; i++) {
      audit[`alias-${i}`] = [{ timestamp: i, oldTo: '', newTo: `url-${i}` }];
    }
    resetChromeStorage({ audit });

    // Adding a new alias should evict the one with smallest timestamp
    await recordAudit('new-alias', '', 'https://new.com');
    const data = await getStorage();
    expect(data.audit['new-alias']).toBeDefined();
    // alias-0 had timestamp 0 (oldest) and should be evicted
    expect(data.audit['alias-0']).toBeUndefined();
  });
});

describe('saveConfigsWithAudit', () => {
  it('saves configs to storage', async () => {
    await saveConfigsWithAudit([['a', 'https://a.com']]);
    const { configs } = await getStorage();
    expect(configs).toEqual([['a', 'https://a.com']]);
  });

  it('records audit for changed entries', async () => {
    resetChromeStorage({ configs: [['a', 'https://old.com']] });
    await saveConfigsWithAudit([['a', 'https://new.com']]);
    const { audit } = await getStorage();
    expect(audit['a']).toHaveLength(1);
    expect(audit['a'][0].oldTo).toBe('https://old.com');
    expect(audit['a'][0].newTo).toBe('https://new.com');
  });

  it('records audit for new entries', async () => {
    await saveConfigsWithAudit([['brand-new', 'https://new.com']]);
    const { audit } = await getStorage();
    expect(audit['brand-new']).toHaveLength(1);
    expect(audit['brand-new'][0].oldTo).toBe('');
  });

  it('does not record audit for unchanged entries', async () => {
    resetChromeStorage({ configs: [['a', 'https://same.com']] });
    await saveConfigsWithAudit([['a', 'https://same.com']]);
    const { audit } = await getStorage();
    expect(audit['a']).toBeUndefined();
  });
});
