/**
 * Settings tab — homepage, server URL, sync button, Google login.
 */

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Stack,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import GoogleIcon from '@mui/icons-material/Google';
import { syncFromServer } from '../shared/sync';
import { googleLogin, googleLogout, isGoogleLoggedIn, getGoogleEmail } from '../shared/google-auth';

interface Props {
  homepage: string;
  serverUrl: string;
  onSaveHomepage: (val: string) => void;
  onSaveServerUrl: (val: string) => void;
  onServerSync: () => void;
}

export default function SettingsTab({ homepage, serverUrl, onSaveHomepage, onSaveServerUrl, onServerSync }: Props) {
  const [hp, setHp] = useState(homepage);
  const [sUrl, setSUrl] = useState(serverUrl);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Check google login state on mount
  React.useEffect(() => {
    getGoogleEmail().then(setGoogleEmail);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      await syncFromServer(sUrl);
      setSyncMsg('Server sync successful!');
      onServerSync();
    } catch (err: any) {
      setSyncMsg(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await googleLogin();
      const email = await getGoogleEmail();
      setGoogleEmail(email);
    } catch (err: any) {
      setSyncMsg(`Google login failed: ${err.message}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    await googleLogout();
    setGoogleEmail(null);
  };

  return (
    <Stack spacing={3}>
      {/* Homepage */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Homepage
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          The URL to set as your browser homepage.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
            placeholder="https://synle.github.io/fav/"
          />
          <Button variant="contained" onClick={() => onSaveHomepage(hp)}>
            Save
          </Button>
        </Box>
      </Paper>

      {/* Server URL + Sync */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Server Sync
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Fetch and merge configs from a remote JSON file.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            fullWidth
            size="small"
            value={sUrl}
            onChange={(e) => setSUrl(e.target.value)}
            placeholder="https://raw.githubusercontent.com/..."
          />
          <Button variant="outlined" onClick={() => onSaveServerUrl(sUrl)}>
            Save URL
          </Button>
        </Box>
        <Button
          variant="contained"
          startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? 'Syncing...' : 'Sync from Server'}
        </Button>
        {syncMsg && (
          <Alert severity={syncMsg.includes('fail') ? 'error' : 'success'} sx={{ mt: 1 }}>
            {syncMsg}
          </Alert>
        )}
      </Paper>

      {/* Google Login */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Google Account (Optional)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Sign in with Google to sync your data to Google Drive for cross-device backup.
        </Typography>
        {googleEmail ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">Signed in as <strong>{googleEmail}</strong></Typography>
            <Button variant="outlined" size="small" color="error" onClick={handleGoogleLogout}>
              Sign Out
            </Button>
          </Box>
        ) : (
          <Button
            variant="outlined"
            startIcon={googleLoading ? <CircularProgress size={16} /> : <GoogleIcon />}
            onClick={handleGoogleLogin}
            disabled={googleLoading}
          >
            Sign in with Google
          </Button>
        )}
      </Paper>
    </Stack>
  );
}
