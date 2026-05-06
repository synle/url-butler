/**
 * Storage module — wraps chrome.storage.local with typed helpers.
 *
 * Stores: homepage, configs, audit history, serverUrl, googleToken.
 * Audit history caps at 5000 aliases, 50 changes per alias.
 */

import type { StorageData, ConfigItem, AuditHistory, AuditChange, ConfigEntry } from './types';
import { normalizeConfig } from './redirect';

const MAX_AUDIT_ALIASES = 5000;
const MAX_CHANGES_PER_ALIAS = 50;

const DEFAULTS: StorageData = {
  homepage: '',
  configs: [],
  audit: {},
  serverUrl: 'https://raw.githubusercontent.com/synle/fav/refs/heads/main/url-porter.json',
};

/** Read the full storage object, filling missing keys with defaults. */
export async function getStorage(): Promise<StorageData> {
  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULTS, (result) => {
      resolve(result as StorageData);
    });
  });
}

/** Overwrite specific keys in storage. */
export async function setStorage(partial: Partial<StorageData>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(partial, resolve);
  });
}

/** Build a lookup map from alias → target using current configs. */
export async function getConfigMap(): Promise<Map<string, string>> {
  const { configs } = await getStorage();
  const map = new Map<string, string>();
  for (const item of configs) {
    const entry = normalizeConfig(item);
    map.set(entry.from.toLowerCase(), entry.to);
  }
  return map;
}

/**
 * Record an audit change for an alias.
 * Enforces the 5000-alias / 50-change limits.
 */
export async function recordAudit(alias: string, oldTo: string, newTo: string): Promise<void> {
  const { audit } = await getStorage();
  const key = alias.toLowerCase();
  const change: AuditChange = { timestamp: Date.now(), oldTo, newTo };

  if (!audit[key]) {
    // Check alias count limit
    const aliasCount = Object.keys(audit).length;
    if (aliasCount >= MAX_AUDIT_ALIASES) {
      // Evict the oldest alias (fewest-recent change)
      let oldestKey = '';
      let oldestTs = Infinity;
      for (const [k, changes] of Object.entries(audit)) {
        const last = changes[changes.length - 1]?.timestamp ?? 0;
        if (last < oldestTs) {
          oldestTs = last;
          oldestKey = k;
        }
      }
      if (oldestKey) delete audit[oldestKey];
    }
    audit[key] = [];
  }

  audit[key].push(change);

  // Cap at 50 changes per alias — keep most recent
  if (audit[key].length > MAX_CHANGES_PER_ALIAS) {
    audit[key] = audit[key].slice(-MAX_CHANGES_PER_ALIAS);
  }

  await setStorage({ audit });
}

/**
 * Save configs and record audit diffs for any changed entries.
 */
export async function saveConfigsWithAudit(newConfigs: ConfigItem[]): Promise<void> {
  const { configs: oldConfigs } = await getStorage();

  // Build old map
  const oldMap = new Map<string, string>();
  for (const item of oldConfigs) {
    const e = normalizeConfig(item);
    oldMap.set(e.from.toLowerCase(), e.to);
  }

  // Detect changes and record audit
  for (const item of newConfigs) {
    const e = normalizeConfig(item);
    const key = e.from.toLowerCase();
    const oldTo = oldMap.get(key) ?? '';
    if (oldTo !== e.to) {
      await recordAudit(key, oldTo, e.to);
    }
  }

  await setStorage({ configs: newConfigs });
}
