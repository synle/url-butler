/**
 * Cycle Detection error page.
 *
 * Displayed when a redirect chain forms a cycle (e.g., a → b → a).
 * Shows the full chain, the original query, and a link to settings.
 */

import React from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  Divider,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SettingsIcon from '@mui/icons-material/Settings';

const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#d32f2f' } },
});

export default function CycleDetection() {
  const params = new URLSearchParams(window.location.search);
  const chainRaw = params.get('chain');
  const query = params.get('query') ?? 'unknown';

  let chain: string[] = [];
  try {
    chain = chainRaw ? JSON.parse(chainRaw) : [];
  } catch {
    chain = [];
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Redirect Cycle Detected
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            The shortlink <strong>"{query}"</strong> creates an infinite redirect loop.
            The redirect chain loops back on itself and cannot resolve to a final URL.
          </Typography>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            Redirect Chain:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, flexWrap: 'wrap', mb: 3 }}>
            {chain.map((item, i) => (
              <React.Fragment key={i}>
                <Chip
                  label={item}
                  color={i === chain.length - 1 ? 'error' : 'default'}
                  variant={i === chain.length - 1 ? 'filled' : 'outlined'}
                />
                {i < chain.length - 1 && (
                  <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                )}
              </React.Fragment>
            ))}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            To fix this, open Settings and update the redirect chain so it resolves
            to a final URL instead of looping.
          </Typography>

          <Button
            variant="contained"
            startIcon={<SettingsIcon />}
            onClick={() => chrome.runtime.openOptionsPage()}
          >
            Open Settings
          </Button>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}
