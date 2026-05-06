/**
 * Core type definitions for URL Butler.
 *
 * Configs can be stored in two forms:
 *   - Array:  ["alias", "target"]
 *   - Object: { from: "alias", to: "target" }
 *
 * Internally we normalize everything to ConfigEntry objects.
 */

/** Array form: [from, to] */
export type ConfigArray = [string, string];

/** Object form */
export interface ConfigObject {
  from: string;
  to: string;
}

/** A config item as it appears in storage / JSON import */
export type ConfigItem = ConfigArray | ConfigObject;

/** Normalized internal representation */
export interface ConfigEntry {
  from: string;
  to: string;
}

/** A single audit change record */
export interface AuditChange {
  timestamp: number;
  oldTo: string;
  newTo: string;
}

/** Audit history keyed by alias */
export interface AuditHistory {
  [alias: string]: AuditChange[];
}

/** Root data stored in chrome.storage.local */
export interface StorageData {
  homepage: string;
  configs: ConfigItem[];
  audit: AuditHistory;
  serverUrl: string;
  googleToken?: string;
}

/** Server JSON shape */
export interface ServerData {
  homepage?: string;
  configs?: ConfigItem[];
}

/** Result of resolving a redirect chain */
export interface ResolveResult {
  /** Final destination URL (empty string if cycle) */
  destination: string;
  /** Ordered list of aliases visited */
  chain: string[];
  /** True when a cycle was detected */
  isCycle: boolean;
}

/** Backup / export format */
export interface BackupData {
  version: 1;
  exportedAt: string;
  homepage: string;
  configs: ConfigItem[];
  audit: AuditHistory;
  serverUrl: string;
}
