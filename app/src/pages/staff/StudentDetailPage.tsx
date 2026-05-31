import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { toastSuccess } from '../../feedback/toast';
import { apiJson, downloadPdfGet, parseApiError } from '../../api/http';
import { GradingKeyTable } from '../../components/GradingKeyTable';
import { MetricCard } from '../../staff/MetricCard';
import { PageHeader } from '../../staff/PageHeader';
import { useStaffAuth } from '../../staff/StaffAuthContext';
import type { GradingBand } from '../../utils/grading';

type Progress = {
  attendance_days: number;
  tests_total: number;
  tests_taken: number;
  tests_passed: number;
  level_completed: boolean;
  modules: {
    module_id: number;
    module_name: string;
    test_taken: boolean;
    test_passed: boolean;
    score: number | null;
    max_score: number | null;
    percent: number | null;
    source: string | null;
  }[];
  overall_percent: number | null;
  overall_grade_label: string | null;
  overall_grade_short: string | null;
  grading_scale: GradingBand[];
};

type StudentDetail = {
  id: number;
  registration_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  guardian_name: string | null;
  guardian_relationship: string | null;
  session: { id: number; name: string };
  level: { id: number; name: string };
  progress: Progress;
  level_completed_by: { name: string } | null;
};

type TierOption = { id: number; name: string };

type ProgressModule = Progress['modules'][number];

function ModuleResultRow({
  studentId,
  module,
  isAdmin,
  onSaved,
  onError,
}: {
  studentId: string;
  module: ProgressModule;
  isAdmin: boolean;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
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

  return (
    <TableRow>
      <TableCell>{module.module_name}</TableCell>
      {editing ? (
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              type="number"
              size="small"
              label="Score"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              sx={{ width: 84 }}
              inputProps={{ min: 0 }}
            />
            <Typography variant="body2">/</Typography>
            <TextField
              type="number"
              size="small"
              label="Max"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              sx={{ width: 84 }}
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
      <TableCell>{module.source ?? '—'}</TableCell>
      <TableCell>
        {!module.test_taken && <Chip size="small" label="Not taken" />}
        {module.test_taken && module.test_passed && <Chip size="small" color="success" label="Passed" />}
        {module.test_taken && !module.test_passed && <Chip size="small" color="error" label="Fail" />}
      </TableCell>
      {isAdmin && (
        <TableCell align="right">
          {editing ? (
            <Stack direction="row" spacing={1} justifyContent="flex-end">
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

export function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { isAdmin } = useStaffAuth();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tiers, setTiers] = useState<TierOption[]>([]);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    guardian_name: '',
    guardian_relationship: '',
    jbs_level_id: '' as number | '',
  });

  const load = useCallback(() => {
    if (!studentId) return;
    apiJson<{ data: StudentDetail }>(`/api/v1/admin/registrations/${studentId}`)
      .then((r) => {
        setStudent(r.data);
        setCompleted(r.data.progress.level_completed);
        setProfile({
          first_name: r.data.first_name,
          last_name: r.data.last_name,
          email: r.data.email,
          phone: r.data.phone ?? '',
          guardian_name: r.data.guardian_name ?? '',
          guardian_relationship: r.data.guardian_relationship ?? '',
          jbs_level_id: r.data.level.id,
        });
        setError(null);
      })
      .catch(() => setError('Could not load student.'));
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!student) return;
    apiJson<{ data: { levels: TierOption[] } }>(`/api/v1/admin/sessions/${student.session.id}`)
      .then((r) => setTiers(r.data.levels.map((l) => ({ id: l.id, name: l.name }))))
      .catch(() => setTiers([]));
  }, [student]);

  const saveProfile = async () => {
    if (!studentId) return;
    setSaving(true);
    setError(null);
    try {
      await apiJson(`/api/v1/admin/registrations/${studentId}`, {
        method: 'PATCH',
        json: {
          first_name: profile.first_name.trim(),
          last_name: profile.last_name.trim(),
          email: profile.email.trim(),
          phone: profile.phone.trim() || null,
          guardian_name: profile.guardian_name.trim() || null,
          guardian_relationship: profile.guardian_relationship.trim() || null,
          ...(profile.jbs_level_id !== '' ? { jbs_level_id: profile.jbs_level_id } : {}),
        },
      });
      toastSuccess('Student details saved.');
      load();
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const saveCompletion = async (value: boolean) => {
    if (!studentId) return;
    setSaving(true);
    setError(null);
    try {
      await apiJson(`/api/v1/admin/registrations/${studentId}/completion`, {
        method: 'PATCH',
        json: { level_completed: value },
      });
      setCompleted(value);
      toastSuccess(
        value
          ? 'Marked as completed — student can download statement and certificate.'
          : 'Tier completion removed.',
      );
      load();
    } catch (e) {
      setError(parseApiError(e));
      setCompleted(student?.progress.level_completed ?? false);
    } finally {
      setSaving(false);
    }
  };

  const download = async (kind: 'id-card' | 'statement' | 'certificate') => {
    if (!studentId || !student) return;
    setError(null);
    try {
      await downloadPdfGet(
        `/api/v1/admin/registrations/${studentId}/documents/${kind}`,
        `jbs-${kind}-${student.registration_number}.pdf`,
      );
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  if (!student) {
    return error ? <Alert severity="error">{error}</Alert> : <Typography>Loading…</Typography>;
  }

  const p = student.progress;

  return (
    <>
      <Button component={RouterLink} to="/staff/students" size="small" sx={{ mb: 2 }}>
        ← Students
      </Button>
      <PageHeader
        title={student.first_name + ' ' + student.last_name}
        subtitle={`${student.registration_number} · ${student.session.name} · ${student.level.name}`}
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard label="Attendance days" value={p.attendance_days} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard label="Tests taken" value={`${p.tests_taken}/${p.tests_total}`} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard label="Tests passed" value={p.tests_passed} hint="≥40% (Pass grade)" color="success" />
        </Grid>
        {p.overall_grade_label != null && p.overall_percent != null && (
          <Grid size={{ xs: 6, sm: 3 }}>
            <MetricCard
              label="Overall grade"
              value={p.overall_grade_label}
              hint={`${p.overall_percent}% average`}
              color="primary"
            />
          </Grid>
        )}
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard
            label="Tier status"
            value={p.level_completed ? 'Completed' : 'In progress'}
            color={p.level_completed ? 'success' : 'default'}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Student details
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Registration number cannot be changed. Email must be unique within this session.
            </Typography>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="First name"
                  value={profile.first_name}
                  onChange={(e) => setProfile((f) => ({ ...f, first_name: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Last name"
                  value={profile.last_name}
                  onChange={(e) => setProfile((f) => ({ ...f, last_name: e.target.value }))}
                  fullWidth
                />
              </Stack>
              <TextField
                label="Email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((f) => ({ ...f, email: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Phone"
                value={profile.phone}
                onChange={(e) => setProfile((f) => ({ ...f, phone: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Guardian name"
                value={profile.guardian_name}
                onChange={(e) => setProfile((f) => ({ ...f, guardian_name: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Guardian relationship"
                value={profile.guardian_relationship}
                onChange={(e) => setProfile((f) => ({ ...f, guardian_relationship: e.target.value }))}
                fullWidth
              />
              <TextField
                select
                label="Tier"
                value={profile.jbs_level_id}
                onChange={(e) =>
                  setProfile((f) => ({
                    ...f,
                    jbs_level_id: e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                helperText="Move this student to a different tier within the same session."
                disabled={tiers.length === 0}
                fullWidth
              >
                {tiers.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </TextField>
              <Button variant="contained" onClick={() => void saveProfile()} disabled={saving} sx={{ alignSelf: 'flex-start' }}>
                {saving ? 'Saving…' : 'Save details'}
              </Button>
            </Stack>
          </Paper>
        </Grid>
        {isAdmin && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tier completion
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={completed}
                  disabled={saving}
                  onChange={(e) => void saveCompletion(e.target.checked)}
                />
              }
              label={completed ? 'Successfully completed this tier' : 'Not marked complete'}
            />
            {student.level_completed_by && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Last set by {student.level_completed_by.name}
              </Typography>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
              <Button size="small" variant="outlined" onClick={() => void download('id-card')}>
                ID card
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={!completed}
                onClick={() => void download('statement')}
              >
                Statement
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={!completed}
                onClick={() => void download('certificate')}
              >
                Certificate
              </Button>
            </Stack>
          </Paper>
        </Grid>
        )}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 2, overflowX: 'auto' }}>
            <Typography variant="h6" gutterBottom sx={{ px: 1 }}>
              Module results
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Module</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>%</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Status</TableCell>
                  {isAdmin && <TableCell align="right" />}
                </TableRow>
              </TableHead>
              <TableBody>
                {p.modules.map((m) => (
                  <ModuleResultRow
                    key={m.module_id}
                    studentId={studentId ?? ''}
                    module={m}
                    isAdmin={isAdmin}
                    onSaved={load}
                    onError={setError}
                  />
                ))}
              </TableBody>
            </Table>
            {isAdmin && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1, mt: 1 }}>
                Edit a score to correct a mistake made when it was recorded. Changes are logged in the audit trail.
              </Typography>
            )}
            {(p.grading_scale ?? []).length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Overall grading scale
                </Typography>
                <GradingKeyTable scale={p.grading_scale} compact />
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
