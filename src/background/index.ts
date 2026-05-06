/**
 * Background service worker for URL Butler.
 *
 * Responsibilities:
 * 1. Listen for navigation events and redirect matching URLs.
 * 2. Resolve chained shortlinks.
 * 3. Detect cycles and redirect to the cycle-detection page.
 * 4. Handle omnibox input (typed in address bar with keyword trigger).
 * 5. Run initial server sync on install.
 */

import { getStorage, getConfigMap } from '../shared/storage';
import { resolveRedirect, ensureProtocol } from '../shared/redirect';
import { syncFromServer } from '../shared/sync';
import { syncBookmarks } from '../shared/bookmarks';

/**
 * On extension install / update, sync from server and bookmarks.
 */
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await syncFromServer();
    console.log('[url-butler] Initial server sync complete.');
  } catch (err) {
    console.warn('[url-butler] Initial server sync failed, using local data:', err);
    // Still sync bookmarks from whatever local data exists
    const { configs, homepage } = await getStorage();
    await syncBookmarks(configs, homepage);
  }
});

/**
 * Listen for messages from popup / options pages.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'RESOLVE_REDIRECT') {
    handleResolve(message.query).then(sendResponse);
    return true; // async response
  }

  if (message.type === 'SYNC_SERVER') {
    syncFromServer(message.serverUrl)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'SYNC_BOOKMARKS') {
    getStorage().then(({ configs, homepage }) => {
      syncBookmarks(configs, homepage).then(() => sendResponse({ success: true }));
    });
    return true;
  }

  if (message.type === 'NAVIGATE') {
    handleNavigate(message.query);
    sendResponse({ success: true });
  }
});

/**
 * Resolve a query and return the result (used by popup autocomplete).
 */
async function handleResolve(query: string) {
  const configMap = await getConfigMap();
  return resolveRedirect(query, configMap);
}

/**
 * Navigate the current tab to the resolved destination.
 * If a cycle is detected, open the cycle detection page.
 */
async function handleNavigate(query: string) {
  const configMap = await getConfigMap();
  const result = resolveRedirect(query, configMap);

  if (result.isCycle) {
    // Open cycle detection page with error details
    const params = new URLSearchParams({
      chain: JSON.stringify(result.chain),
      query,
    });
    chrome.tabs.create({
      url: chrome.runtime.getURL(`src/cycle/index.html?${params.toString()}`),
    });
    return;
  }

  if (result.destination) {
    // Get current active tab and navigate
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        chrome.tabs.update(tab.id, { url: result.destination });
      } else {
        chrome.tabs.create({ url: result.destination });
      }
    });
  }
}

/**
 * Listen for web navigation to check if any navigated URL matches a config alias.
 * This handles cases where the user types an alias directly in the address bar.
 */
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only handle main frame, top-level navigation
  if (details.frameId !== 0) return;

  try {
    const url = new URL(details.url);
    // Check if the hostname (without www.) matches a config alias
    const hostname = url.hostname.replace(/^www\./, '');
    const configMap = await getConfigMap();
    const result = resolveRedirect(hostname, configMap);

    if (result.destination && result.chain.length > 1) {
      if (result.isCycle) {
        const params = new URLSearchParams({
          chain: JSON.stringify(result.chain),
          query: hostname,
        });
        chrome.tabs.update(details.tabId, {
          url: chrome.runtime.getURL(`src/cycle/index.html?${params.toString()}`),
        });
      } else {
        chrome.tabs.update(details.tabId, { url: result.destination });
      }
    }
  } catch {
    // Not a valid URL, ignore
  }
});
