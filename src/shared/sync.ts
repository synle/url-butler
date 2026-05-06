/**
 * Server sync module.
 *
 * Fetches config JSON from a remote URL, merges it with local storage,
 * then triggers bookmark sync and audit recording.
 */

import type { ServerData, ConfigItem, StorageData } from './types';
import { getStorage, setStorage, saveConfigsWithAudit } from './storage';
import { normalizeConfig } from './redirect';
import { syncBookmarks } from './bookmarks';

/**
 * Fetch config from the server URL, merge with local, sync bookmarks.
 * Returns the merged data or throws on network error.
 */
export async function syncFromServer(serverUrl?: string): Promise<StorageData> {
  const storage = await getStorage();
  const url = serverUrl ?? storage.serverUrl;

  if (!url) throw new Error('No server URL configured');

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Server returned ${response.status}`);

  const serverData: ServerData = await response.json();

  // Merge homepage — server wins if present
  const homepage = serverData.homepage ?? storage.homepage;

  // Merge configs — deduplicate by alias, server values take priority
  const localMap = new Map<string, ConfigItem>();
  for (const item of storage.configs) {
    const e = normalizeConfig(item);
    localMap.set(e.from.toLowerCase(), item);
  }

  if (serverData.configs) {
    for (const item of serverData.configs) {
      const e = normalizeConfig(item);
      localMap.set(e.from.toLowerCase(), item);
    }
  }

  const mergedConfigs = Array.from(localMap.values());

  // Save with audit tracking
  await saveConfigsWithAudit(mergedConfigs);
  await setStorage({ homepage, serverUrl: url });

  // Sync to bookmarks
  await syncBookmarks(mergedConfigs, homepage);

  return await getStorage();
}
