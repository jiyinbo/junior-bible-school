import { useState, type ReactNode } from 'react';
import { Button, Chip, Stack, TableCell, TableRow, TextField, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { toastSuccess } from '../../feedback/toast';
import { apiJson, parseApiError } from '../../api/http';
import type { StudentProgressModule } from '../../components/StudentProgressPanel';
import { formatModuleGrade, gradeChipColor } from '../../utils/grading';

export type ModuleScoreEditorProps = {
  studentId: string;
  module: StudentProgressModule;
  isAdmin: boolean;
  onSaved: () => void;
  onError: (msg: string) => void;
};

/** Shared inline score-editing state used by both the table row and the mobile card. */
export function useModuleScoreEditor({
  studentId,
  module,
  onSaved,
  onError,
}: Omit<ModuleScoreEditorProps, 'isAdmin'>) {
  const [editing, setEditing] = useState(false);
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [busy, setBusy] = useState(false);

  const startEdit = () => {
    setScore(module.score != null ? String(module.score) : '');
    setMaxScore(module.max_score != null ? String(module.max_score) : '100');
    setEditing(true);
  };

  const save = async () => {
    setBusy(true);
    onError('');
    try {
      await apiJson(`/api/v1/admin/registrations/${studentId}/scores`, {
        method: 'PATCH',
        json: {
          jbs_module_id: module.module_id,
          score: Number(score),
          max_score: Number(maxScore) || 100,
        },
      });
      toastSuccess('Score updated.');
      setEditing(false);
      onSaved();
    } catch (e) {
      onError(parseApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    onError('');
    try {
      await apiJson(`/api/v1/admin/registrations/${studentId}/scores`, {
        method: 'DELETE',
        json: { jbs_module_id: module.module_id },
      });
      toastSuccess('Score cleared.');
      setEditing(false);
      onSaved();
    } catch (e) {
      onError(parseApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return {
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
  };
}

/** Grade chip (or em dash) shared by the row and card. */
export function moduleGradeChip(module: StudentProgressModule): ReactNode {
  if (module.test_taken && module.grade_short) {
    return (
      <Chip
        size="small"
        label={formatModuleGrade(module)}
        color={gradeChipColor(module.test_passed, module.grade_short, 'module')}
      />
    );
  }
  return '—';
}

/** Status chip shared by the row and card. */
export function moduleStatusChip(module: StudentProgressModule): ReactNode {
  if (!module.test_taken) {
    return <Chip size="small" label="Not taken" />;
  }
  if (module.test_passed) {
    return <Chip size="small" color="success" label="Credit (D+)" />;
  }
  return (
    <Chip
      size="small"
      color="error"
      label={module.grade_short === 'NS' ? 'No show' : 'Below credit'}
    />
  );
}

export function StudentModuleScoreRow({
  studentId,
  module,
  isAdmin,
  onSaved,
  onError,
}: ModuleScoreEditorProps) {
  const { editing, setEditing, score, setScore, maxScore, setMaxScore, busy, startEdit, save, clear } =
    useModuleScoreEditor({ studentId, module, onSaved, onError });

  return (
    <TableRow>
      <TableCell>{module.module_name}</TableCell>
      {editing ? (
        <TableCell>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <TextField
              type="number"
              size="small"
              label="Score"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              sx={{ width: { xs: '100%', sm: 84 } }}
              inputProps={{ min: 0 }}
            />
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              /
            </Typography>
            <TextField
              type="number"
              size="small"
              label="Max"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              sx={{ width: { xs: '100%', sm: 84 } }}
              inputProps={{ min: 1 }}
            />
          </Stack>
        </TableCell>
      ) : (
        <TableCell>
          {module.test_taken && module.score != null ? `${module.score} / ${module.max_score}` : '—'}
        </TableCell>
      )}
      <TableCell>{module.test_taken && module.percent != null ? `${module.percent}%` : '—'}</TableCell>
      <TableCell>{moduleGradeChip(module)}</TableCell>
      <TableCell>{module.source ?? '—'}</TableCell>
      <TableCell>{moduleStatusChip(module)}</TableCell>
      {isAdmin && (
        <TableCell align="right">
          {editing ? (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent="flex-end"
            >
              <Button size="small" variant="contained" onClick={() => void save()} disabled={busy || score === ''}>
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
            <Button size="small" startIcon={<EditIcon fontSize="small" />} onClick={startEdit}>
              {module.test_taken ? 'Edit' : 'Add'}
            </Button>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
