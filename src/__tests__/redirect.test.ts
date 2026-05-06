import { describe, it, expect } from 'vitest';
import { normalizeConfig, ensureProtocol, resolveRedirect, detectAllCycles } from '../shared/redirect';

describe('normalizeConfig', () => {
  it('converts array form to object', () => {
    expect(normalizeConfig(['go', 'https://go.com'])).toEqual({ from: 'go', to: 'https://go.com' });
  });

  it('passes through object form', () => {
    expect(normalizeConfig({ from: 'go', to: 'https://go.com' })).toEqual({
      from: 'go',
      to: 'https://go.com',
    });
  });
});

describe('ensureProtocol', () => {
  it('returns URL unchanged if already has http://', () => {
    expect(ensureProtocol('http://example.com')).toBe('http://example.com');
  });

  it('returns URL unchanged if already has https://', () => {
    expect(ensureProtocol('https://example.com')).toBe('https://example.com');
  });

  it('prepends http:// to bare hostname', () => {
    expect(ensureProtocol('example.com')).toBe('http://example.com');
  });

  it('prepends http:// to IP address', () => {
    expect(ensureProtocol('192.168.1.1')).toBe('http://192.168.1.1');
  });

  it('is case-insensitive for protocol check', () => {
    expect(ensureProtocol('HTTP://EXAMPLE.COM')).toBe('HTTP://EXAMPLE.COM');
  });
});

describe('resolveRedirect', () => {
  it('returns empty destination for unknown alias', () => {
    const map = new Map<string, string>();
    const result = resolveRedirect('unknown', map);
    expect(result.destination).toBe('');
    expect(result.isCycle).toBe(false);
    expect(result.chain).toEqual(['unknown']);
  });

  it('resolves a single alias to a URL', () => {
    const map = new Map([['gem', 'https://gemini.google.com']]);
    const result = resolveRedirect('gem', map);
    expect(result.destination).toBe('https://gemini.google.com');
    expect(result.chain).toEqual(['gem', 'https://gemini.google.com']);
    expect(result.isCycle).toBe(false);
  });

  it('resolves chained aliases', () => {
    const map = new Map([
      ['g', 'gemini'],
      ['gemini', 'https://gemini.google.com/app'],
    ]);
    const result = resolveRedirect('g', map);
    expect(result.destination).toBe('https://gemini.google.com/app');
    expect(result.chain).toEqual(['g', 'gemini', 'https://gemini.google.com/app']);
  });

  it('detects a simple cycle', () => {
    const map = new Map([
      ['a', 'b'],
      ['b', 'a'],
    ]);
    const result = resolveRedirect('a', map);
    expect(result.isCycle).toBe(true);
    expect(result.destination).toBe('');
    expect(result.chain).toEqual(['a', 'b', 'a']);
  });

  it('detects self-referencing cycle', () => {
    const map = new Map([['loop', 'loop']]);
    const result = resolveRedirect('loop', map);
    expect(result.isCycle).toBe(true);
    expect(result.chain).toEqual(['loop', 'loop']);
  });

  it('is case-insensitive on alias lookup', () => {
    const map = new Map([['mysite', 'https://mysite.com']]);
    const result = resolveRedirect('MySite', map);
    expect(result.destination).toBe('https://mysite.com');
  });

  it('adds http:// protocol to bare hostname destination', () => {
    const map = new Map([['local', 'myserver.local']]);
    const result = resolveRedirect('local', map);
    expect(result.destination).toBe('http://myserver.local');
  });

  it('adds http:// to IP address destination', () => {
    const map = new Map([['router', '192.168.1.1']]);
    const result = resolveRedirect('router', map);
    expect(result.destination).toBe('http://192.168.1.1');
  });

  it('resolves chain ending in bare hostname', () => {
    const map = new Map([
      ['r', 'router'],
      ['router', '10.0.0.1'],
    ]);
    const result = resolveRedirect('r', map);
    expect(result.destination).toBe('http://10.0.0.1');
  });

  it('handles three-level chain', () => {
    const map = new Map([
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'https://final.com'],
    ]);
    const result = resolveRedirect('a', map);
    expect(result.destination).toBe('https://final.com');
    expect(result.chain).toEqual(['a', 'b', 'c', 'https://final.com']);
  });

  it('returns no match when query is a plain URL not in map', () => {
    const map = new Map<string, string>();
    const result = resolveRedirect('https://already-a-url.com', map);
    // isUrl returns true for https://, so single-length chain with URL → returns URL
    expect(result.destination).toBe('https://already-a-url.com');
  });
});

describe('detectAllCycles', () => {
  it('returns empty array when no cycles exist', () => {
    const map = new Map([
      ['a', 'https://a.com'],
      ['b', 'https://b.com'],
    ]);
    expect(detectAllCycles(map)).toEqual([]);
  });

  it('detects a single cycle', () => {
    const map = new Map([
      ['a', 'b'],
      ['b', 'a'],
    ]);
    const cycles = detectAllCycles(map);
    expect(cycles.length).toBe(1);
    expect(cycles[0]).toEqual(['a', 'b', 'a']);
  });

  it('detects multiple independent cycles', () => {
    const map = new Map([
      ['a', 'b'],
      ['b', 'a'],
      ['x', 'y'],
      ['y', 'x'],
    ]);
    const cycles = detectAllCycles(map);
    expect(cycles.length).toBe(2);
  });

  it('does not duplicate cycles for same loop', () => {
    const map = new Map([
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'a'],
    ]);
    const cycles = detectAllCycles(map);
    // 'a' finds the cycle; 'b' and 'c' are already in checked set
    expect(cycles.length).toBe(1);
  });
});
