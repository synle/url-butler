/**
 * Bookmark sync module.
 *
 * Maintains a "url-butler" folder in Chrome bookmarks.
 * Each config entry becomes a bookmark: title = alias, url = target.
 * On every config/homepage change, the folder is wiped and rebuilt.
 */

import type { ConfigItem, ConfigEntry } from './types';
import { normalizeConfig, ensureProtocol } from './redirect';

const FOLDER_NAME = 'url-butler';

/** Find or create the url-butler bookmark folder under "Other Bookmarks". */
async function getOrCreateFolder(): Promise<chrome.bookmarks.BookmarkTreeNode> {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.search({ title: FOLDER_NAME }, (results) => {
      const folder = results.find((r) => !r.url);
      if (folder) {
        resolve(folder);
        return;
      }
      // Create under "Other Bookmarks" (id "2")
      chrome.bookmarks.create({ parentId: '2', title: FOLDER_NAME }, (created) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(created);
      });
    });
  });
}

/** Remove all children of a bookmark folder. */
async function clearFolder(folderId: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.bookmarks.getChildren(folderId, (children) => {
      const promises = children.map(
        (child) =>
          new Promise<void>((res) => {
            if (child.url) {
              chrome.bookmarks.remove(child.id, () => res());
            } else {
              chrome.bookmarks.removeTree(child.id, () => res());
            }
          }),
      );
      Promise.all(promises).then(() => resolve());
    });
  });
}

/**
 * Sync configs to the url-butler bookmark folder.
 * Also adds a "Homepage" bookmark if homepage is set.
 */
export async function syncBookmarks(configs: ConfigItem[], homepage: string): Promise<void> {
  try {
    const folder = await getOrCreateFolder();
    await clearFolder(folder.id);

    // Add homepage bookmark
    if (homepage) {
      await new Promise<void>((resolve) => {
        chrome.bookmarks.create(
          { parentId: folder.id, title: '🏠 Homepage', url: ensureProtocol(homepage) },
          () => resolve(),
        );
      });
    }

    // Add each config as a bookmark
    for (const item of configs) {
      const entry = normalizeConfig(item);
      const url = /^https?:\/\//i.test(entry.to) ? entry.to : ensureProtocol(entry.to);
      await new Promise<void>((resolve) => {
        chrome.bookmarks.create(
          { parentId: folder.id, title: entry.from, url },
          () => resolve(),
        );
      });
    }
  } catch (err) {
    console.error('[url-butler] Bookmark sync failed:', err);
  }
}
