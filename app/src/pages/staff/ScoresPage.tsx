import { useCallback, useEffect, useMemo, useState } from 'react';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { apiJson } from '../../api/http';
import { toastSuccess } from '../../feedback/toast';
import { PageHeader } from '../../staff/PageHeader';
import { EnterScoreDialog } from './EnterScoreDialog';
import { ScoresBandCounts } from './ScoresBandCounts';
import { ScoresMatrixTable } from './ScoresMatrixTable';
import { ScoresTopThree } from './ScoresTopThree';
import {
  exportTierBoardCsv,
  parseSessionLevelKey,
  sessionLevelKey,
  type LevelOption,
  type ModuleOption,
  type TierBoardData,
} from './scoresShared';

export function ScoresPage() {
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [levelKey, setLevelKey] = useState('');
  const [board, setBoard] = useState<TierBoardData | null>(null);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    apiJson<{ data: ModuleOption[] }>('/api/v1/staff/my-modules')
      .then((r) => setModules(r.data))
      .catch(() => setError('Could not load modules.'));
  }, []);

  const levelOptions = useMemo((): LevelOption[] => {
    const map = new Map<string, LevelOption>();
    for (const m of modules) {
      const key = sessionLevelKey(m);
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: m.level,
          session: m.session,
          level: m.level,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [modules]);

  const loadBoard = useCallback(async (key: string) => {
    const parsed = parseSessionLevelKey(key);
    if (!parsed) {
      setBoard(null);
      return;
    }
    setLoadingBoard(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        session: parsed.session,
        level: parsed.level,
      });
      const response = await apiJson<{ data: TierBoardData }>(
        `/api/v1/staff/scores/tier-board?${params}`,
      );
      setBoard(response.data);
    } catch {
      setError('Could not load scores for this tier.');
      setBoard(null);
    } finally {
      setLoadingBoard(false);
    }
  }, []);

  useEffect(() => {
    if (!levelKey) {
      setBoard(null);
      return;
    }
    void loadBoard(levelKey);
  }, [levelKey, loadBoard]);

  const selectedLevelLabel = levelOptions.find((l) => l.key === levelKey)?.label ?? 'tier';

  const exportCsv = () => {
    if (!board) return;
    const date = new Date().toISOString().slice(0, 10);
    const slug = selectedLevelLabel.replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '');
    exportTierBoardCsv(board.modules, board.students, `jbs-scores-${slug}-${date}.csv`);
    toastSuccess('Export downloaded');
  };

  return (
    <>
      <PageHeader
        title="Scores"
        subtitle="Select a session and tier to review module scores, overall grades, and top students."
        action={
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon />}
              disabled={!board || board.students.length === 0}
              onClick={exportCsv}
            >
              Export CSV
            </Button>
            <Button
              variant="contained"
              disabled={!levelKey}
              onClick={() => setDialogOpen(true)}
            >
              Enter score
            </Button>
          </Box>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2.5}>
        <TextField
          select
          label="Tier"
          value={levelKey}
          onChange={(e) => setLevelKey(e.target.value)}
          sx={{ maxWidth: 420 }}
          helperText={
            levelOptions.length === 0
              ? 'No modules available yet'
              : 'Choose a tier to load the scores board'
          }
        >
          {levelOptions.map((l) => (
            <MenuItem key={l.key} value={l.key}>
              {l.label}
            </MenuItem>
          ))}
        </TextField>

        {!levelKey ? (
          <Typography color="text.secondary">
            Select a session and tier to see scores.
          </Typography>
        ) : loadingBoard ? (
          <Typography color="text.secondary">Loading scores…</Typography>
        ) : board ? (
          <>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                alignItems: 'stretch',
              }}
            >
              <ScoresTopThree students={board.top3} />
              <ScoresBandCounts students={board.students} />
            </Box>
            <ScoresMatrixTable modules={board.modules} students={board.students} />
          </>
        ) : null}
      </Stack>

      <EnterScoreDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          if (levelKey) void loadBoard(levelKey);
        }}
        modules={modules}
        initialLevelKey={levelKey}
      />
    </>
  );
}
