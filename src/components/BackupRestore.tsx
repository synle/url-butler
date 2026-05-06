/**
 * Backup & Restore tab.
 *
 * - Export all data (homepage, configs, audit, serverUrl) to a JSON file.
 * - Import/restore from a previously exported JSON file.
 * - Upload/download from Google Drive if logged in.
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  Alert,
  Divider,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import type { BackupData, StorageData } from '../shared/types';
import { getStorage, setStorage, saveConfigsWithAudit } from '../shared/storage';
import { syncBookmarks } from '../shared/bookmarks';
import { isGoogleLoggedIn, uploadToGoogleDrive, downloadFromGoogleDrive } from '../shared/google-auth';

interface Props {
  onRestore: () => void;
}

export default function BackupRestore({ onRestore }: Props) {
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');
  const [googleAvailable, setGoogleAvailable] = useState(false);

  React.useEffect(() => {
    isGoogleLoggedIn().then(setGoogleAvailable);
  }, []);

  /** Export all data as a downloaded JSON file. */
  const handleExport = async () => {
    try {
      const data = await getStorage();
      const backup: BackupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        homepage: data.homepage,
        configs: data.configs,
        audit: data.audit,
        serverUrl: data.serverUrl,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `url-butler-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('Backup exported successfully!');
      setMsgType('success');
    } catch (err: any) {
      setMsg(`Export failed: ${err.message}`);
      setMsgType('error');
    }
  };

  /** Import from a JSON file. */
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const backup: BackupData = JSON.parse(text);

        if (!backup.configs || !Array.isArray(backup.configs)) {
          throw new Error('Invalid backup: missing configs array');
        }

        await saveConfigsWithAudit(backup.configs);
        await setStorage({
          homepage: backup.homepage ?? '',
          serverUrl: backup.serverUrl ?? '',
          audit: backup.audit ?? {},
        });

        const { configs, homepage } = await getStorage();
        await syncBookmarks(configs, homepage);

        setMsg('Backup restored successfully!');
        setMsgType('success');
        onRestore();
      } catch (err: any) {
        setMsg(`Import failed: ${err.message}`);
        setMsgType('error');
      }
    };
    input.click();
  };

  /** Upload to Google Drive. */
  const handleCloudUpload = async () => {
    try {
      const data = await getStorage();
      const backup: BackupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        homepage: data.homepage,
        configs: data.configs,
        audit: data.audit,
        serverUrl: data.serverUrl,
      };
      await uploadToGoogleDrive(backup);
      setMsg('Uploaded to Google Drive!');
      setMsgType('success');
    } catch (err: any) {
      setMsg(`Cloud upload failed: ${err.message}`);
      setMsgType('error');
    }
  };

  /** Download from Google Drive. */
  const handleCloudDownload = async () => {
    try {
      const backup = await downloadFromGoogleDrive();
      if (!backup) {
        setMsg('No backup found on Google Drive.');
        setMsgType('error');
        return;
      }

      await saveConfigsWithAudit(backup.configs);
      await setStorage({
        homepage: backup.homepage ?? '',
        serverUrl: backup.serverUrl ?? '',
        audit: backup.audit ?? {},
      });

      const { configs, homepage } = await getStorage();
      await syncBookmarks(configs, homepage);

      setMsg('Restored from Google Drive!');
      setMsgType('success');
      onRestore();
    } catch (err: any) {
      setMsg(`Cloud download failed: ${err.message}`);
      setMsgType('error');
    }
  };

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Local Backup
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Export all data (homepage, configs, audit history) to a JSON file, or restore from a backup.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExport}>
            Export Backup
          </Button>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={handleImport}>
            Import Backup
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Google Drive Sync
        </Typography>
        {googleAvailable ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sync your data to/from Google Drive for cross-device backup.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={handleCloudUpload}>
                Upload to Drive
              </Button>
              <Button variant="outlined" startIcon={<CloudDownloadIcon />} onClick={handleCloudDownload}>
                Download from Drive
              </Button>
            </Box>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Sign in with Google on the Settings tab to enable cloud sync.
          </Typography>
        )}
      </Paper>

      {msg && (
        <Alert severity={msgType} onClose={() => setMsg('')}>
          {msg}
        </Alert>
      )}
    </Stack>
  );
}
