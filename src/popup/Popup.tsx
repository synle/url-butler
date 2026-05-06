/**
 * Popup page — Omni Searchbox.
 *
 * Provides autocomplete over all config aliases.
 * Selecting an alias resolves the shortlink chain and navigates immediately.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  TextField,
  Autocomplete,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  InputAdornment,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { ConfigEntry, ResolveResult } from '../shared/types';
import { normalizeConfig, resolveRedirect } from '../shared/redirect';

const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#1976d2' } },
  typography: { fontSize: 13 },
});

interface AliasOption {
  alias: string;
  target: string;
}

export default function Popup() {
  const [options, setOptions] = useState<AliasOption[]>([]);
  const [configMap, setConfigMap] = useState<Map<string, string>>(new Map());
  const [inputValue, setInputValue] = useState('');
  const [preview, setPreview] = useState<ResolveResult | null>(null);

  // Load configs on mount
  useEffect(() => {
    chrome.storage.local.get({ configs: [] }, (result) => {
      const map = new Map<string, string>();
      const opts: AliasOption[] = [];
      for (const item of result.configs) {
        const entry = normalizeConfig(item);
        map.set(entry.from.toLowerCase(), entry.to);
        opts.push({ alias: entry.from, target: entry.to });
      }
      setConfigMap(map);
      setOptions(opts);
    });
  }, []);

  // Filter options based on input
  const filtered = useMemo(() => {
    if (!inputValue) return options.slice(0, 20);
    const q = inputValue.toLowerCase();
    return options.filter(
      (o) => o.alias.toLowerCase().includes(q) || o.target.toLowerCase().includes(q),
    );
  }, [inputValue, options]);

  // Resolve preview when input changes
  useEffect(() => {
    if (!inputValue || configMap.size === 0) {
      setPreview(null);
      return;
    }
    const result = resolveRedirect(inputValue, configMap);
    if (result.chain.length > 1 || result.destination) {
      setPreview(result);
    } else {
      setPreview(null);
    }
  }, [inputValue, configMap]);

  const handleNavigate = (query: string) => {
    chrome.runtime.sendMessage({ type: 'NAVIGATE', query });
    window.close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue) {
      handleNavigate(inputValue);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: 1.5 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }}>
            URL Butler
          </Typography>
          <Tooltip title="Settings">
            <IconButton
              size="small"
              onClick={() => chrome.runtime.openOptionsPage()}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Search input */}
        <TextField
          fullWidth
          size="small"
          placeholder="Type a shortlink or search..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1 }}
        />

        {/* Chain preview */}
        {preview && (
          <Box sx={{ mb: 1, p: 1, bgcolor: preview.isCycle ? '#ffebee' : '#e3f2fd', borderRadius: 1 }}>
            {preview.isCycle ? (
              <Typography variant="caption" color="error">
                Cycle detected: {preview.chain.join(' → ')}
              </Typography>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                  {preview.chain.map((item, i) => (
                    <React.Fragment key={i}>
                      <Chip label={item} size="small" variant={i === preview.chain.length - 1 ? 'filled' : 'outlined'} />
                      {i < preview.chain.length - 1 && <ArrowForwardIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                    </React.Fragment>
                  ))}
                </Box>
              </>
            )}
          </Box>
        )}

        <Divider sx={{ mb: 0.5 }} />

        {/* Filtered results list */}
        <List dense sx={{ maxHeight: 240, overflow: 'auto' }}>
          {filtered.map((opt) => (
            <ListItemButton
              key={opt.alias}
              onClick={() => handleNavigate(opt.alias)}
              sx={{ borderRadius: 1, py: 0.5 }}
            >
              <ListItemText
                primary={opt.alias}
                secondary={opt.target}
                primaryTypographyProps={{ fontWeight: 600, fontSize: 13 }}
                secondaryTypographyProps={{ fontSize: 11, noWrap: true }}
              />
              <OpenInNewIcon sx={{ fontSize: 14, color: 'text.secondary', ml: 1 }} />
            </ListItemButton>
          ))}
          {filtered.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1, textAlign: 'center' }}>
              {inputValue ? 'No matches found. Press Enter to search.' : 'Start typing to search shortcuts...'}
            </Typography>
          )}
        </List>
      </Box>
    </ThemeProvider>
  );
}
