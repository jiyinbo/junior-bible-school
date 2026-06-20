import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
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
  TableCell,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { toastSuccess } from '../../feedback/toast';
import { apiJson, downloadPdfGet, parseApiError } from '../../api/http';
import {
  StudentProgressPanel,
  type StudentProgressModule,
} from '../../components/StudentProgressPanel';
import { PageHeader } from '../../staff/PageHeader';
import { useStaffAuth } from '../../staff/StaffAuthContext';
import { formatModuleGrade, gradeChipColor } from '../../utils/grading';
import {
  type StudentDetail,
  type TierOption,
  useStudentDetail,
} from './studentDetailShared';

type ProgressModule = StudentProgressModule;

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
      <TableCell>
        {module.test_taken && module.grade_short ? (
          <Chip
            size="small"
            label={formatModuleGrade(module)}
            color={gradeChipColor(module.test_passed, module.grade_short, 'module')}
          />
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell>{module.source ?? '—'}</TableCell>
      <TableCell>
        {!module.test_taken && <Chip size="small" label="Not taken" />}
        {module.test_taken && module.test_passed && <Chip size="small" color="success" label="Credit (D+)" />}
        {module.test_taken && !module.test_passed && (
          <Chip size="small" color="error" label={module.grade_short === 'NS' ? 'No show' : 'Below credit'} />
        )}
      </TableCell>
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

function profileFromStudent(student: StudentDetail) {
  return {
    first_name: student.first_name,
    last_name: student.last_name,
    email: student.email,
    phone: student.phone ?? '',
    guardian_name: student.guardian_name ?? '',
    guardian_relationship: student.guardian_relationship ?? '',
    jbs_level_id: student.level.id as number | '',
  };
}

export function StudentEditPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useStaffAuth();
  const { student, error, setError, load } = useStudentDetail(studentId);
  const [completed, setCompleted] = useState(false);
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
  const [resetPinValue, setResetPinValue] = useState('');
  const [resetPinResult, setResetPinResult] = useState<string | null>(null);

  useEffect(() => {
    if (!student) return;
    setCompleted(student.progress.level_completed);
    setProfile(profileFromStudent(student));
  }, [student]);

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

  const resetPortalPin = async (sendEmail: boolean) => {
    if (!studentId) return;
    setSaving(true);
    setError(null);
    setResetPinResult(null);
    try {
      const r = await apiJson<{ data: { pin: string }; message: string }>(
        `/api/v1/admin/registrations/${studentId}/pin`,
        {
          method: 'PATCH',
          json: {
            ...(resetPinValue.trim().length === 4 ? { pin: resetPinValue.trim() } : {}),
            send_email: sendEmail,
          },
        },
      );
      setResetPinValue('');
      setResetPinResult(r.data.pin);
      toastSuccess(sendEmail ? 'Portal PIN reset and emailed.' : 'Portal PIN reset.');
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
    <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        sx={{ mb: 2 }}
      >
        <Button component={RouterLink} to="/staff/students" size="small" sx={{ alignSelf: 'flex-start' }}>
          ← Students
        </Button>
        <Button
          component={RouterLink}
          to={`/staff/students/${studentId}`}
          size="small"
          variant="outlined"
          sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
        >
          View student
        </Button>
      </Stack>
      <PageHeader
        title={`Edit · ${student.first_name} ${student.last_name}`}
        subtitle={`${student.registration_number} · ${student.level.name}`}
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ width: '100%', m: 0 }}>
        <Grid size={{ xs: 12, lg: 6 }} sx={{ minWidth: 0 }}>
          <Paper sx={{ p: { xs: 2, sm: 3 }, overflow: 'hidden' }}>
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
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="contained" onClick={() => void saveProfile()} disabled={saving}>
                  {saving ? 'Saving…' : 'Save details'}
                </Button>
                <Button variant="text" onClick={() => navigate(`/staff/students/${studentId}`)} disabled={saving}>
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }} sx={{ minWidth: 0 }}>
          <Paper sx={{ p: { xs: 2, sm: 3 }, overflow: 'hidden' }}>
            <Typography variant="h6" gutterBottom>
              Student portal PIN
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Reset the student&apos;s 4-digit portal PIN if they cannot sign in. Leave blank to generate a random PIN.
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Set specific PIN (optional)"
                value={resetPinValue}
                onChange={(e) => setResetPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                helperText="4 digits, or leave blank for a random PIN"
                fullWidth
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="contained" disabled={saving} onClick={() => void resetPortalPin(true)}>
                  Reset &amp; email PIN
                </Button>
                <Button variant="outlined" disabled={saving} onClick={() => void resetPortalPin(false)}>
                  Reset only
                </Button>
              </Stack>
              {resetPinResult && (
                <Alert severity="info">
                  New PIN:{' '}
                  <strong style={{ fontFamily: 'monospace', letterSpacing: '0.15em' }}>{resetPinResult}</strong>
                </Alert>
              )}
            </Stack>
          </Paper>
        </Grid>
        {isAdmin && (
          <Grid size={{ xs: 12, lg: 6 }} sx={{ minWidth: 0 }}>
            <Paper sx={{ p: { xs: 2, sm: 3 }, overflow: 'hidden' }}>
              <Typography variant="h6" gutterBottom>
                Tier completion
              </Typography>
              <FormControlLabel
                sx={{ alignItems: 'flex-start', mr: 0 }}
                control={
                  <Switch
                    checked={completed}
                    disabled={saving}
                    onChange={(e) => void saveCompletion(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ pt: 0.75, wordBreak: 'break-word' }}>
                    {completed ? 'Successfully completed this tier' : 'Not marked complete'}
                  </Typography>
                }
              />
              {student.level_completed_by && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Last set by {student.level_completed_by.name}
                </Typography>
              )}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
                <Button size="small" variant="outlined" onClick={() => void download('id-card')} fullWidth={false}>
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
        <Grid size={{ xs: 12 }} sx={{ minWidth: 0 }}>
          <Box sx={{ maxWidth: '100%', overflowX: 'auto' }}>
            <StudentProgressPanel
              variant="staff"
              progress={p}
              programmePhase={p.programme_phase}
              showAdminColumn={isAdmin}
              moduleRows={p.modules.map((m) => (
                <ModuleResultRow
                  key={m.module_id}
                  studentId={studentId ?? ''}
                  module={m}
                  isAdmin={isAdmin}
                  onSaved={load}
                  onError={setError}
                />
              ))}
              adminColumnFooter={
                isAdmin ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1, mt: 1 }}>
                    Edit a score to correct a mistake made when it was recorded. Changes are logged in the audit
                    trail.
                  </Typography>
                ) : null
              }
            />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
