import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import {
  Alert,
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
import { apiJson, downloadCsvGet, parseApiError } from '../../api/http';
import { PageHeader } from '../../staff/PageHeader';

type SessionOption = { id: number; name: string };
type LevelOption = { id: number; name: string };

type StudentRow = {
  id: number;
  registration_number: string;
  full_name: string;
  email: string;
  session_name: string;
  level_name: string;
  level_completed: boolean;
  attendance_days: number;
  tests_taken: number;
  tests_passed: number;
  tests_total: number;
};

export function StudentsPage() {
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [levels, setLevels] = useState<LevelOption[]>([]);
  const [sessionId, setSessionId] = useState<number | ''>('');
  const [levelId, setLevelId] = useState<number | ''>('');
  const [query, setQuery] = useState('');
  const [completedFilter, setCompletedFilter] = useState<'' | 'yes' | 'no'>('');
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
    const q = params.toString() ? `?${params}` : '';
    apiJson<{ data: StudentRow[] }>(`/api/v1/admin/registrations${q}`)
      .then((r) => {
        setRows(r.data);
        setError(null);
      })
      .catch(() => setError('Could not load students.'));
  }, [sessionId, levelId, query, completedFilter]);

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
        subtitle="View registration details, attendance and test progress, and mark level completion for statement and certificate access."
        action={
          <Button
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={() => void exportCsv()}
            disabled={exporting}
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
          <TextField
            select
            label="Session"
            size="small"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value === '' ? '' : Number(e.target.value))}
            sx={{ minWidth: 200 }}
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
            label="Level"
            size="small"
            value={levelId}
            onChange={(e) => setLevelId(e.target.value === '' ? '' : Number(e.target.value))}
            disabled={levels.length === 0}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All levels</MenuItem>
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
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="yes">Completed</MenuItem>
            <MenuItem value="no">Not completed</MenuItem>
          </TextField>
          <TextField
            label="Search"
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email, reg #"
            sx={{ flex: 1, minWidth: 180 }}
          />
        </Stack>
      </Paper>

      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Reg #</TableCell>
              <TableCell>Level</TableCell>
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
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    No students match your filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}
