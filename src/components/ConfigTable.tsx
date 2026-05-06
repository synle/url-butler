/**
 * Config table — mass editor for redirect configs.
 *
 * Features:
 * - Add / remove / reorder rows
 * - Inline editing of "from" and "to" fields
 * - Drag-to-reorder via up/down buttons
 * - Save triggers bookmark sync + audit
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Chip,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SaveIcon from '@mui/icons-material/Save';
import WarningIcon from '@mui/icons-material/Warning';
import type { ConfigItem, ConfigEntry } from '../shared/types';
import { normalizeConfig, detectAllCycles } from '../shared/redirect';

interface Props {
  configs: ConfigItem[];
  onSave: (configs: ConfigItem[]) => void;
  saving: boolean;
}

export default function ConfigTable({ configs, onSave, saving }: Props) {
  const [rows, setRows] = useState<ConfigEntry[]>([]);
  const [cycles, setCycles] = useState<string[][]>([]);
  const [dirty, setDirty] = useState(false);

  // Initialize rows from props
  useEffect(() => {
    setRows(configs.map(normalizeConfig));
    setDirty(false);
  }, [configs]);

  // Detect cycles whenever rows change
  useEffect(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.from.toLowerCase(), r.to);
    }
    setCycles(detectAllCycles(map));
  }, [rows]);

  const updateRow = (index: number, field: 'from' | 'to', value: string) => {
    const next = [...rows];
    next[index] = { ...next[index], [field]: value };
    setRows(next);
    setDirty(true);
  };

  const addRow = () => {
    setRows([...rows, { from: '', to: '' }]);
    setDirty(true);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
    setDirty(true);
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
    setDirty(true);
  };

  const handleSave = () => {
    // Filter out empty rows and convert back to array form
    const cleaned: ConfigItem[] = rows
      .filter((r) => r.from.trim() && r.to.trim())
      .map((r): ConfigItem => [r.from.trim(), r.to.trim()]);
    onSave(cleaned);
    setDirty(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Redirect Configs
        </Typography>
        <Chip label={`${rows.length} entries`} size="small" />
        {dirty && <Chip label="Unsaved changes" size="small" color="warning" />}
      </Box>

      {cycles.length > 0 && (
        <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600}>Cycles detected:</Typography>
          {cycles.map((c, i) => (
            <Typography key={i} variant="body2">{c.join(' → ')}</Typography>
          ))}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell width={40}>#</TableCell>
              <TableCell>Alias (from)</TableCell>
              <TableCell>Destination (to)</TableCell>
              <TableCell width={140} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i} hover>
                <TableCell>{i + 1}</TableCell>
                <TableCell>
                  <TextField
                    fullWidth
                    size="small"
                    variant="standard"
                    value={row.from}
                    onChange={(e) => updateRow(i, 'from', e.target.value)}
                    placeholder="alias"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    fullWidth
                    size="small"
                    variant="standard"
                    value={row.to}
                    onChange={(e) => updateRow(i, 'to', e.target.value)}
                    placeholder="https://example.com or another-alias"
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Move up">
                    <span>
                      <IconButton size="small" disabled={i === 0} onClick={() => moveRow(i, -1)}>
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Move down">
                    <span>
                      <IconButton size="small" disabled={i === rows.length - 1} onClick={() => moveRow(i, 1)}>
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => removeRow(i)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={addRow}>
          Add Row
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving ? 'Saving...' : 'Save Configs'}
        </Button>
      </Box>
    </Box>
  );
}
