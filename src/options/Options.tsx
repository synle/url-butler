/**
 * Options page — the main settings UI for URL Butler.
 *
 * Tabs:
 *   1. Settings  — homepage, server URL, sync controls, Google login
 *   2. Configs   — table-based mass editor for redirect configs
 *   3. JSON      — raw JSON editor for configs
 *   4. Audit     — change history with restore capability
 *   5. Backup    — export / import data
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  Box,
} from '@mui/material';
import SettingsTab from '../components/SettingsTab';
import ConfigTable from '../components/ConfigTable';
import JsonEditor from '../components/JsonEditor';
import AuditPage from '../components/AuditPage';
import BackupRestore from '../components/BackupRestore';
import type { StorageData, ConfigItem } from '../shared/types';
import { getStorage, setStorage, saveConfigsWithAudit } from '../shared/storage';
import { syncBookmarks } from '../shared/bookmarks';

const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#1976d2' } },
});

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ py: 2 }}>{children}</Box> : null;
}

export default function Options() {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState<StorageData | null>(null);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState('');

  const loadData = useCallback(async () => {
    const d = await getStorage();
    setData(d);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /** Save homepage and trigger bookmark sync. */
  const saveHomepage = async (homepage: string) => {
    await setStorage({ homepage });
    if (data) {
      await syncBookmarks(data.configs, homepage);
    }
    await loadData();
    setSnack('Homepage saved');
  };

  /** Save server URL. */
  const saveServerUrl = async (serverUrl: string) => {
    await setStorage({ serverUrl });
    await loadData();
    setSnack('Server URL saved');
  };

  /** Save configs from table or JSON editor. */
  const saveConfigs = async (configs: ConfigItem[]) => {
    setSaving(true);
    try {
      await saveConfigsWithAudit(configs);
      const { homepage } = await getStorage();
      await syncBookmarks(configs, homepage);
      await loadData();
      setSnack('Configs saved & bookmarks synced');
    } catch (err: any) {
      setSnack(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  /** Trigger full reload after backup restore or server sync. */
  const handleFullReload = async () => {
    await loadData();
    setSnack('Data reloaded');
  };

  if (!data) return null;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" elevation={1}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            URL Butler — Settings
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
          <Tab label="Settings" />
          <Tab label="Configs (Table)" />
          <Tab label="Configs (JSON)" />
          <Tab label="Audit History" />
          <Tab label="Backup / Restore" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <SettingsTab
            homepage={data.homepage}
            serverUrl={data.serverUrl}
            onSaveHomepage={saveHomepage}
            onSaveServerUrl={saveServerUrl}
            onServerSync={handleFullReload}
          />
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <ConfigTable configs={data.configs} onSave={saveConfigs} saving={saving} />
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <JsonEditor configs={data.configs} onSave={saveConfigs} saving={saving} />
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <AuditPage audit={data.audit} configs={data.configs} onRestore={saveConfigs} />
        </TabPanel>

        <TabPanel value={tab} index={4}>
          <BackupRestore onRestore={handleFullReload} />
        </TabPanel>

        {/* Snackbar-like message */}
        {snack && (
          <Box
            sx={{
              position: 'fixed',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: 'primary.main',
              color: 'white',
              px: 3,
              py: 1,
              borderRadius: 2,
              boxShadow: 3,
              zIndex: 9999,
            }}
            onClick={() => setSnack('')}
          >
            <Typography variant="body2">{snack}</Typography>
          </Box>
        )}
      </Container>
    </ThemeProvider>
  );
}
