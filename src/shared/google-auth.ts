/**
 * Optional Google OAuth login for cross-device cloud sync.
 *
 * Uses chrome.identity.getAuthToken for seamless Google login.
 * When authenticated, data can be backed up to Google Drive.
 */

import { getStorage, setStorage } from './storage';
import type { BackupData } from './types';

/** Trigger Google OAuth interactive login. Returns the access token. */
export async function googleLogin(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message ?? 'Login failed'));
        return;
      }
      setStorage({ googleToken: token });
      resolve(token);
    });
  });
}

/** Logout — revoke and clear the stored token. */
export async function googleLogout(): Promise<void> {
  const { googleToken } = await getStorage();
  if (googleToken) {
    await new Promise<void>((resolve) => {
      chrome.identity.removeCachedAuthToken({ token: googleToken }, () => resolve());
    });
  }
  await setStorage({ googleToken: undefined });
}

/** Check if user is currently authenticated. */
export async function isGoogleLoggedIn(): Promise<boolean> {
  const { googleToken } = await getStorage();
  return !!googleToken;
}

/** Get current user's email using the stored token. */
export async function getGoogleEmail(): Promise<string | null> {
  const { googleToken } = await getStorage();
  if (!googleToken) return null;

  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${googleToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.email ?? null;
  } catch {
    return null;
  }
}

/**
 * Upload backup to Google Drive as a JSON file.
 * Creates or overwrites a file named "url-butler-backup.json".
 */
export async function uploadToGoogleDrive(backup: BackupData): Promise<void> {
  const { googleToken } = await getStorage();
  if (!googleToken) throw new Error('Not logged in to Google');

  const metadata = {
    name: 'url-butler-backup.json',
    mimeType: 'application/json',
  };

  // Check if file already exists
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='url-butler-backup.json'+and+trashed=false&fields=files(id)`,
    { headers: { Authorization: `Bearer ${googleToken}` } },
  );
  const searchData = await searchRes.json();
  const existingId = searchData.files?.[0]?.id;

  const boundary = '-------url_butler_boundary';
  const body = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(backup, null, 2)}\r\n`,
    `--${boundary}--`,
  ].join('');

  const url = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const method = existingId ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${googleToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) throw new Error(`Drive upload failed: ${res.status}`);
}

/** Download backup from Google Drive. */
export async function downloadFromGoogleDrive(): Promise<BackupData | null> {
  const { googleToken } = await getStorage();
  if (!googleToken) throw new Error('Not logged in to Google');

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='url-butler-backup.json'+and+trashed=false&fields=files(id)`,
    { headers: { Authorization: `Bearer ${googleToken}` } },
  );
  const searchData = await searchRes.json();
  const fileId = searchData.files?.[0]?.id;
  if (!fileId) return null;

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${googleToken}` } },
  );
  if (!res.ok) return null;
  return res.json();
}
