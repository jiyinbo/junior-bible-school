import { Button, Paper, Stack, TextField, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { DetailRow } from '../../components/ResponsiveTableLayout';
import {
  moduleGradeChip,
  moduleStatusChip,
  useModuleScoreEditor,
  type ModuleScoreEditorProps,
} from './StudentModuleScoreRow';

/** Mobile-friendly card equivalent of StudentModuleScoreRow (same inline editing). */
export function StudentModuleScoreCard({
  studentId,
  module,
  isAdmin,
  onSaved,
  onError,
}: ModuleScoreEditorProps) {
  const {
    editing,
    setEditing,
    score,
    setScore,
    maxScore,
    setMaxScore,
    busy,
    startEdit,
    save,
    clear,
  } = useModuleScoreEditor({ studentId, module, onSaved, onError });

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.25}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Typography fontWeight={600} sx={{ lineHeight: 1.3, minWidth: 0 }}>
            {module.module_name}
          </Typography>
          {moduleStatusChip(module)}
        </Stack>

        {editing ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              type="number"
              size="small"
              label="Score"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              inputProps={{ min: 0 }}
              sx={{ flex: 1 }}
            />
            <Typography variant="body2">/</Typography>
            <TextField
              type="number"
              size="small"
              label="Max"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              inputProps={{ min: 1 }}
              sx={{ flex: 1 }}
            />
          </Stack>
        ) : (
          <Stack spacing={0.1}>
            <DetailRow label="Score">
              {module.test_taken && module.score != null
                ? `${module.score} / ${module.max_score}`
                : '—'}
            </DetailRow>
            <DetailRow label="Percent">
              {module.test_taken && module.percent != null ? `${module.percent}%` : '—'}
            </DetailRow>
            <DetailRow label="Grade">{moduleGradeChip(module)}</DetailRow>
            <DetailRow label="Source">{module.source ?? '—'}</DetailRow>
          </Stack>
        )}

        {isAdmin &&
          (editing ? (
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                onClick={() => void save()}
                disabled={busy || score === ''}
              >
                Save
              </Button>
              {module.test_taken && (
                <Button size="small" color="error" onClick={() => void clear()} disabled={busy}>
                  Clear
                </Button>
              )}
              <Button size="small" onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </Button>
            </Stack>
          ) : (
            <Button
              size="small"
              startIcon={<EditIcon fontSize="small" />}
              onClick={startEdit}
              sx={{ alignSelf: 'flex-start' }}
            >
              {module.test_taken ? 'Edit' : 'Add'}
            </Button>
          ))}
      </Stack>
    </Paper>
  );
}
