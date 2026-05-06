/**
 * Raw JSON editor for configs.
 *
 * Allows direct editing of the configs array as JSON text.
 * Validates JSON before saving. Shows parse errors inline.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  Chip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import type { ConfigItem } from '../shared/types';

interface Props {
  configs: ConfigItem[];
  onSave: (configs: ConfigItem[]) => void;
  saving: boolean;
}

export default function JsonEditor({ configs, onSave, saving }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  // Format configs as pretty JSON on load
  useEffect(() => {
    setText(JSON.stringify(configs, null, 2));
    setDirty(false);
    setError('');
  }, [configs]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setDirty(true);
    setError('');
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        setError('Configs must be an array.');
        return;
      }
      // Validate each entry
      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        if (Array.isArray(item)) {
          if (item.length !== 2 || typeof item[0] !== 'string' || typeof item[1] !== 'string') {
            setError(`Entry ${i}: Array items must be ["from", "to"].`);
            return;
          }
        } else if (typeof item === 'object' && item !== null) {
          if (typeof item.from !== 'string' || typeof item.to !== 'string') {
            setError(`Entry ${i}: Object items must have "from" and "to" string fields.`);
            return;
          }
        } else {
          setError(`Entry ${i}: Must be an array or object.`);
          return;
        }
      }
      onSave(parsed);
      setDirty(false);
    } catch (e: any) {
      setError(`Invalid JSON: ${e.message}`);
    }
  };

  const handleReset = () => {
    setText(JSON.stringify(configs, null, 2));
    setDirty(false);
    setError('');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Raw JSON Editor
        </Typography>
        {dirty && <Chip label="Unsaved changes" size="small" color="warning" />}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Edit configs directly as JSON. Supports both array form{' '}
        <code>["alias", "url"]</code> and object form{' '}
        <code>{`{"from": "alias", "to": "url"}`}</code>.
      </Typography>

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <textarea
          value={text}
          onChange={handleChange}
          spellCheck={false}
          style={{
            width: '100%',
            minHeight: 400,
            padding: 12,
            fontFamily: 'monospace',
            fontSize: 13,
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
            backgroundColor: '#fafafa',
          }}
        />
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving ? 'Saving...' : 'Save Configs'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<RestoreIcon />}
          onClick={handleReset}
          disabled={!dirty}
        >
          Reset
        </Button>
      </Box>
    </Box>
  );
}
