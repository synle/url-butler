/**
 * Audit history page.
 *
 * Shows all aliases with their change history (max 50 per alias).
 * Allows restoring a previous version of any alias's target.
 * Displays cycle warnings if detected in current configs.
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Chip,
  Alert,
  TextField,
  InputAdornment,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RestoreIcon from '@mui/icons-material/Restore';
import SearchIcon from '@mui/icons-material/Search';
import WarningIcon from '@mui/icons-material/Warning';
import type { AuditHistory, ConfigItem, AuditChange } from '../shared/types';
import { normalizeConfig, detectAllCycles } from '../shared/redirect';

interface Props {
  audit: AuditHistory;
  configs: ConfigItem[];
  onRestore: (configs: ConfigItem[]) => void;
}

export default function AuditPage({ audit, configs, onRestore }: Props) {
  const [filter, setFilter] = useState('');

  const aliases = useMemo(() => {
    const entries = Object.entries(audit).sort((a, b) => {
      const aLast = a[1][a[1].length - 1]?.timestamp ?? 0;
      const bLast = b[1][b[1].length - 1]?.timestamp ?? 0;
      return bLast - aLast; // most recent first
    });
    if (!filter) return entries;
    const q = filter.toLowerCase();
    return entries.filter(([alias]) => alias.includes(q));
  }, [audit, filter]);

  // Detect cycles in current configs
  const cycles = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of configs) {
      const e = normalizeConfig(item);
      map.set(e.from.toLowerCase(), e.to);
    }
    return detectAllCycles(map);
  }, [configs]);

  /** Restore an alias to a previous target value. */
  const handleRestore = (alias: string, newTo: string) => {
    const updated: ConfigItem[] = configs.map((item) => {
      const e = normalizeConfig(item);
      if (e.from.toLowerCase() === alias.toLowerCase()) {
        return [e.from, newTo];
      }
      return item;
    });
    onRestore(updated);
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleString();

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Audit History
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Shows change history for each alias (max 50 changes per alias, 5000 aliases total).
      </Typography>

      {cycles.length > 0 && (
        <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600}>Active cycles in configs:</Typography>
          {cycles.map((c, i) => (
            <Typography key={i} variant="body2">{c.join(' → ')}</Typography>
          ))}
        </Alert>
      )}

      <TextField
        fullWidth
        size="small"
        placeholder="Filter aliases..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {aliases.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No audit history yet. Changes will appear here after you modify configs.
        </Typography>
      )}

      {aliases.map(([alias, changes]) => (
        <Accordion key={alias} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography fontWeight={600}>{alias}</Typography>
              <Chip label={`${changes.length} changes`} size="small" variant="outlined" />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Old Target</TableCell>
                    <TableCell>New Target</TableCell>
                    <TableCell width={100}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...changes].reverse().map((change, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontSize: 12 }}>{formatDate(change.timestamp)}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {change.oldTo || '(new)'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{change.newTo}</TableCell>
                      <TableCell>
                        {change.oldTo && (
                          <Button
                            size="small"
                            startIcon={<RestoreIcon />}
                            onClick={() => handleRestore(alias, change.oldTo)}
                          >
                            Restore
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
