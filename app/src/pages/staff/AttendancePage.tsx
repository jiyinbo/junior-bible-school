import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { toastSuccess } from '../../feedback/toast';
import { apiJson, parseApiError } from '../../api/http';
import { PageHeader } from '../../staff/PageHeader';
import { useStaffAuth } from '../../staff/StaffAuthContext';

type Session = { id: number; name: string };
type AttendanceStatus = {
  can_record: boolean;
  ongoing_sessions: { id: number; name: string }[];
};
type LogRow = {
  id: number;
  attended_on: string;
  recorded_at: string;
  registration_number: string;
  student_name: string;
  session: string;
  level: string;
  recorded_by: string;
};

function formatRecordedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function AttendancePage() {
  const { isAdmin } = useStaffAuth();
  const [tab, setTab] = useState(0);

  const [regNum, setRegNum] = useState('');
  const [status, setStatus] = useState<AttendanceStatus | null>(null);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionFilter, setSessionFilter] = useState<number | ''>('');
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = () => {
    apiJson<{ data: AttendanceStatus }>('/api/v1/staff/attendance/status')
      .then((r) => setStatus(r.data))
      .catch(() => {});
  };

  useEffect(() => {
    loadStatus();
    apiJson<{ data: Session[] }>('/api/v1/staff/attendance/sessions')
      .then((r) => setSessions(r.data))
      .catch(() => {});
  }, []);

  const loadLogs = () => {
    if (!isAdmin) return;
    const params = new URLSearchParams();
    if (sessionFilter) params.set('jbs_session_id', String(sessionFilter));
    const q = params.toString() ? `?${params}` : '';
    apiJson<{ data: LogRow[] }>(`/api/v1/staff/attendance/logs${q}`)
      .then((r) => setLogs(r.data))
      .catch(() => setError('Could not load attendance logs.'));
  };

  useEffect(() => {
    if (isAdmin && tab === 1) loadLogs();
  }, [isAdmin, tab, sessionFilter]);

  const scan = async () => {
    if (!regNum.trim()) return;
    setError(null);
    try {
      const r = await apiJson<{ message: string }>('/api/v1/staff/attendance/scan', {
        method: 'POST',
        json: { registration_number: regNum.trim() },
      });
      toastSuccess(r.message);
      setRegNum('');
      loadStatus();
      if (isAdmin && tab === 1) loadLogs();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const canRecord = status?.can_record ?? false;

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Scan or paste a registration number (same as the QR on the ID card). Attendance is logged with the current date and time."
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {status && (
        <Alert severity={canRecord ? 'info' : 'warning'} sx={{ mb: 2 }}>
          {canRecord
            ? `Programme in progress: ${status.ongoing_sessions.map((s) => s.name).join(', ')}`
            : 'No programme session is running right now. Attendance cannot be recorded until a session is in progress.'}
        </Alert>
      )}

      {isAdmin && (
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Scan / record" />
          <Tab label="Attendance log" />
        </Tabs>
      )}

      {(!isAdmin || tab === 0) && (
        <Paper sx={{ p: 3, maxWidth: 420 }}>
          <Stack spacing={2}>
            <TextField
              label="Registration number"
              value={regNum}
              onChange={(e) => setRegNum(e.target.value)}
              fullWidth
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && canRecord && void scan()}
              placeholder="e.g. L1/0001"
              disabled={!canRecord}
            />
            <Button variant="contained" onClick={() => void scan()} disabled={!canRecord}>
              Record attendance
            </Button>
          </Stack>
        </Paper>
      )}

      {isAdmin && tab === 1 && (
        <Box>
          <TextField
            select
            label="Session"
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value === '' ? '' : Number(e.target.value))}
            size="small"
            sx={{ mb: 2, minWidth: 220 }}
          >
            <MenuItem value="">All sessions</MenuItem>
            {sessions.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Recorded</TableCell>
                  <TableCell>Student</TableCell>
                  <TableCell>Reg #</TableCell>
                  <TableCell>Session</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatRecordedAt(row.recorded_at)}</TableCell>
                    <TableCell>{row.student_name}</TableCell>
                    <TableCell>{row.registration_number}</TableCell>
                    <TableCell>{row.session}</TableCell>
                    <TableCell>{row.level}</TableCell>
                    <TableCell>{row.recorded_by}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}
    </>
  );
}
