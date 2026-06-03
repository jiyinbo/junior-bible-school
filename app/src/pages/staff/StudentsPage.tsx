import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  DetailRow,
  ListCard,
  ResponsiveTableLayout,
} from '../../components/ResponsiveTableLayout';
import { apiJson, downloadCsvGet, parseApiError } from '../../api/http';
import { PageHeader } from '../../staff/PageHeader';
import { useStaffAuth } from '../../staff/StaffAuthContext';

type SessionOption = { id: number; name: string };
type LevelOption = { id: number; name: string };

type StudentRow = {
  id: number;
  registration_number: string;
  full_name: string;
  email: string;
  session_name: string;
  level_name: string;
  allergies: string | null;
  level_completed: boolean;
  attendance_days: number;
  tests_taken: number;
  tests_passed: number;
  tests_total: number;
};

function StudentCard({ row }: { row: StudentRow }) {
  return (
    <ListCard
      action={
        <Typography
          component={RouterLink}
          to={`/staff/students/${row.id}`}
          variant="body2"
          sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          View
        </Typography>
      }
    >
      <Typography fontWeight={600}>{row.full_name}</Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        {row.email}
      </Typography>
      <Stack spacing={0.25} sx={{ mt: 1.5 }}>
        <DetailRow label="Reg #">
          <Typography variant="body2">{row.registration_number}</Typography>
        </DetailRow>
        <DetailRow label="Tier">
          <Typography variant="body2">{row.level_name}</Typography>
        </DetailRow>
        <DetailRow label="Session">
          <Typography variant="body2">{row.session_name}</Typography>
        </DetailRow>
        <DetailRow label="Allergies / medical">
          {row.allergies ? (
            <Typography variant="body2" color="error.main">
              {row.allergies}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              —
            </Typography>
          )}
        </DetailRow>
        <DetailRow label="Attendance">
          <Typography variant="body2">{row.attendance_days}</Typography>
        </DetailRow>
        <DetailRow label="Tests">
          <Typography variant="body2">
            {row.tests_passed}/{row.tests_taken} of {row.tests_total}
          </Typography>
        </DetailRow>
        <DetailRow label="Status">
          <Chip
            size="small"
            label={row.level_completed ? 'Completed' : 'In progress'}
            color={row.level_completed ? 'success' : 'default'}
          />
        </DetailRow>
      </Stack>
    </ListCard>
  );
}

export function StudentsPage() {
  const { isAdmin } = useStaffAuth();
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [levels, setLevels] = useState<LevelOption[]>([]);
  const [sessionId, setSessionId] = useState<number | ''>('');
  const [levelId, setLevelId] = useState<number | ''>('');
  const [query, setQuery] = useState('');
  const [completedFilter, setCompletedFilter] = useState<'' | 'yes' | 'no'>('');
  const [allergiesOnly, setAllergiesOnly] = useState(false);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    apiJson<{ data: SessionOption[] }>('/api/v1/admin/sessions')
      .then((r) => setSessions(r.data))
      .catch(() => setError('Could not load sessions.'));
  }, []);

  useEffect(() => {
    if (sessionId === '') {
      setLevels([]);
      setLevelId('');
      return;
    }
    apiJson<{ data: { levels: LevelOption[] } }>(`/api/v1/admin/sessions/${sessionId}`)
      .then((r) => setLevels(r.data.levels.map((l) => ({ id: l.id, name: l.name }))))
      .catch(() => setLevels([]));
    setLevelId('');
  }, [sessionId]);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (sessionId !== '') params.set('jbs_session_id', String(sessionId));
    if (levelId !== '') params.set('jbs_level_id', String(levelId));
    if (query.trim()) params.set('q', query.trim());
    if (completedFilter === 'yes') params.set('level_completed', '1');
    if (completedFilter === 'no') params.set('level_completed', '0');
    if (allergiesOnly) params.set('has_allergies', '1');
    const q = params.toString() ? `?${params}` : '';
    apiJson<{ data: StudentRow[] }>(`/api/v1/admin/registrations${q}`)
      .then((r) => {
        setRows(r.data);
        setError(null);
      })
      .catch(() => setError('Could not load students.'));
  }, [sessionId, levelId, query, completedFilter, allergiesOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const buildFilterParams = () => {
    const params = new URLSearchParams();
    if (sessionId !== '') params.set('jbs_session_id', String(sessionId));
    if (levelId !== '') params.set('jbs_level_id', String(levelId));
    if (query.trim()) params.set('q', query.trim());
    if (completedFilter === 'yes') params.set('level_completed', '1');
    if (completedFilter === 'no') params.set('level_completed', '0');
    if (allergiesOnly) params.set('has_allergies', '1');
    return params;
  };

  const exportCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      const q = buildFilterParams().toString();
      const path = q ? `/api/v1/admin/registrations/export?${q}` : '/api/v1/admin/registrations/export';
      const date = new Date().toISOString().slice(0, 10);
      await downloadCsvGet(path, `jbs-students-${date}.csv`);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Students"
        subtitle="View registration details, attendance and test progress, and mark tier completion for statement and certificate access."
        action={
          isAdmin ? (
            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={() => void exportCsv()}
              disabled={exporting}
            >
              {exporting ? 'Exporting…' : 'Export CSV'}
            </Button>
          ) : undefined
        }
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
          }}
        >
          <TextField
            select
            label="Session"
            size="small"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value === '' ? '' : Number(e.target.value))}
            fullWidth
          >
            <MenuItem value="">All sessions</MenuItem>
            {sessions.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Tier"
            size="small"
            value={levelId}
            onChange={(e) => setLevelId(e.target.value === '' ? '' : Number(e.target.value))}
            disabled={levels.length === 0}
            fullWidth
          >
            <MenuItem value="">All tiers</MenuItem>
            {levels.map((l) => (
              <MenuItem key={l.id} value={l.id}>
                {l.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Completion"
            size="small"
            value={completedFilter}
            onChange={(e) => setCompletedFilter(e.target.value as '' | 'yes' | 'no')}
            fullWidth
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="yes">Completed</MenuItem>
            <MenuItem value="no">Not completed</MenuItem>
          </TextField>
          <TextField
            select
            label="Allergies / medical"
            size="small"
            value={allergiesOnly ? 'yes' : ''}
            onChange={(e) => setAllergiesOnly(e.target.value === 'yes')}
            fullWidth
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="yes">With allergies / medical</MenuItem>
          </TextField>
          <TextField
            label="Search"
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email, reg #"
            fullWidth
            sx={{ gridColumn: '1 / -1' }}
          />
        </Box>
      </Paper>

      <Paper sx={{ p: { xs: 2, md: 0 }, overflow: 'hidden' }}>
        <ResponsiveTableLayout
          isEmpty={rows.length === 0}
          empty={
            <Typography color="text.secondary" sx={{ py: 2 }}>
              No students match your filters.
            </Typography>
          }
          table={
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Reg #</TableCell>
                  <TableCell>Tier</TableCell>
                  <TableCell>Allergies / medical</TableCell>
                  <TableCell align="center">Attendance</TableCell>
                  <TableCell align="center">Tests</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{row.full_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.email}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.registration_number}</TableCell>
                    <TableCell>
                      {row.level_name}
                      <Typography variant="caption" display="block" color="text.secondary">
                        {row.session_name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 240 }}>
                      {row.allergies ? (
                        <Typography variant="body2" color="error.main">
                          {row.allergies}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">{row.attendance_days}</TableCell>
                    <TableCell align="center">
                      {row.tests_passed}/{row.tests_taken} of {row.tests_total}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.level_completed ? 'Completed' : 'In progress'}
                        color={row.level_completed ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        component={RouterLink}
                        to={`/staff/students/${row.id}`}
                        variant="body2"
                        sx={{ fontWeight: 600 }}
                      >
                        View
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
          cards={rows.map((row) => (
            <StudentCard key={row.id} row={row} />
          ))}
        />
      </Paper>
    </>
  );
}
