/**
 * Redirect resolution engine.
 *
 * - Normalizes config items (array or object) into { from, to }.
 * - Resolves shortlink chains: ezreceipt → wagework → https://...
 * - Detects cycles: a → b → a  ⇒  isCycle: true
 */

import type { ConfigItem, ConfigEntry, ResolveResult } from './types';

/** Convert a ConfigItem (array or object) into a normalized ConfigEntry. */
export function normalizeConfig(item: ConfigItem): ConfigEntry {
  if (Array.isArray(item)) {
    return { from: item[0], to: item[1] };
  }
  return { from: item.from, to: item.to };
}

/** Check if a value looks like a full URL (has protocol or starts with a known TLD pattern). */
function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(value);
}

/**
 * Ensure a destination has a protocol prefix.
 * IP addresses and hostnames without protocol get http:// prepended.
 */
export function ensureProtocol(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `http://${url}`;
}

/**
 * Resolve a query through the config map, following chained shortlinks.
 *
 * @param query  The alias or URL the user typed.
 * @param configMap  Map of lowercase-alias → target value.
 * @returns ResolveResult with destination, chain, and cycle flag.
 */
export function resolveRedirect(query: string, configMap: Map<string, string>): ResolveResult {
  const chain: string[] = [query];
  const visited = new Set<string>();
  let current = query.toLowerCase();

  visited.add(current);

  while (true) {
    const target = configMap.get(current);
    if (!target) {
      // No more mapping — current is the final destination
      // If it's the same as the original query and not a URL, no match
      if (chain.length === 1 && !isUrl(query)) {
        return { destination: '', chain, isCycle: false };
      }
      // The last item in the chain is the destination
      const dest = chain[chain.length - 1];
      return { destination: isUrl(dest) ? dest : ensureProtocol(dest), chain, isCycle: false };
    }

    const targetLower = target.toLowerCase();

    // Cycle detection
    if (visited.has(targetLower)) {
      chain.push(target);
      return { destination: '', chain, isCycle: true };
    }

    visited.add(targetLower);
    chain.push(target);

    // If the target is a full URL, we're done
    if (isUrl(target)) {
      return { destination: target, chain, isCycle: false };
    }

    // Otherwise keep resolving the chain
    current = targetLower;
  }
}

/**
 * Scan all configs and return any aliases that are part of a cycle.
 */
export function detectAllCycles(configMap: Map<string, string>): string[][] {
  const cycles: string[][] = [];
  const checked = new Set<string>();

  for (const alias of configMap.keys()) {
    if (checked.has(alias)) continue;
    const result = resolveRedirect(alias, configMap);
    result.chain.forEach((c) => checked.add(c.toLowerCase()));
    if (result.isCycle) {
      cycles.push(result.chain);
    }
  }

  return cycles;
}
