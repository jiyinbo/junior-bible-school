import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
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
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  EmptyTableMessage,
  ResponsiveTableLayout,
} from '../../components/ResponsiveTableLayout';
import { apiJson, downloadCsvGet, parseApiError } from '../../api/http';
import { PageHeader } from '../../staff/PageHeader';
import { useStaffAuth } from '../../staff/StaffAuthContext';
import { studentTierStatusDisplay } from './studentDetailShared';

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
  programme_phase: string;
  attendance_days: number;
  tests_taken: number;
  tests_passed: number;
  tests_total: number;
};

type ListMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
};

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

function StudentStatusChip({ row }: { row: StudentRow }) {
  const { label, color } = studentTierStatusDisplay(row.level_completed, row.programme_phase);
  return <Chip size="small" label={label} color={color} />;
}

function StudentRowActions({
  studentId,
  layout = 'links',
}: {
  studentId: number;
  layout?: 'links' | 'buttons' | 'compact-buttons';
}) {
  if (layout === 'buttons') {
    return (
      <Button component={RouterLink} to={`/staff/students/${studentId}`} variant="contained" size="small" fullWidth>
        View
      </Button>
    );
  }

  if (layout === 'compact-buttons') {
    return (
      <Button component={RouterLink} to={`/staff/students/${studentId}`} variant="contained" size="small">
        View
      </Button>
    );
  }

  return (
    <Typography
      component={RouterLink}
      to={`/staff/students/${studentId}`}
      variant="body2"
      sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}
    >
      View
    </Typography>
  );
}

function StudentTableRow({ row }: { row: StudentRow }) {
  return (
    <TableRow hover>
      <TableCell sx={{ minWidth: 220 }}>
        <Typography fontWeight={600}>{row.full_name}</Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ wordBreak: 'break-all' }}>
          {row.registration_number}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ wordBreak: 'break-all' }}>
          {row.email}
        </Typography>
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.level_name}</TableCell>
      <TableCell sx={{ minWidth: 120 }}>
        <Typography variant="body2">{row.attendance_days} days</Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {row.tests_passed}/{row.tests_taken} of {row.tests_total} tests
        </Typography>
      </TableCell>
      <TableCell>
        <StudentStatusChip row={row} />
      </TableCell>
      <TableCell sx={{ maxWidth: 220 }}>
        {row.allergies ? (
          <Typography variant="body2" color="error.main" sx={{ wordBreak: 'break-word' }}>
            {row.allergies}
          </Typography>
        ) : null}
      </TableCell>
      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        <StudentRowActions studentId={row.id} layout="compact-buttons" />
      </TableCell>
    </TableRow>
  );
}

function StudentCardStat({ label, value }: { label: string; value: string | number }) {
  return (
    <Box
      sx={{
        px: 1.25,
        py: 1,
        borderRadius: 1,
        bgcolor: 'grey.50',
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Box>
  );
}

function StudentCard({ row }: { row: StudentRow }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography fontWeight={600} sx={{ lineHeight: 1.3 }}>
              {row.full_name}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25, wordBreak: 'break-all' }}>
              {row.registration_number}
            </Typography>
          </Box>
          <StudentStatusChip row={row} />
        </Stack>

        <Stack spacing={0.25}>
          <Typography variant="body2">{row.level_name}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
            {row.email}
          </Typography>
        </Stack>

        {row.allergies && (
          <Typography variant="body2" color="error.main" sx={{ wordBreak: 'break-word' }}>
            {row.allergies}
          </Typography>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 1,
          }}
        >
          <StudentCardStat label="Attendance" value={row.attendance_days} />
          <StudentCardStat
            label="Tests"
            value={`${row.tests_passed}/${row.tests_taken} of ${row.tests_total}`}
          />
        </Box>

        <StudentRowActions studentId={row.id} layout="buttons" />
      </Stack>
    </Paper>
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
  const [meta, setMeta] = useState<ListMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 25,
    total: 0,
    from: null,
    to: null,
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);

  const resetPage = () => setPage(0);

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
    params.set('page', String(page + 1));
    params.set('per_page', String(rowsPerPage));
    setLoading(true);
    apiJson<{ data: StudentRow[]; meta: ListMeta }>(`/api/v1/admin/registrations?${params}`)
      .then((r) => {
        setRows(r.data);
        setMeta(r.meta);
        setError(null);
      })
      .catch(() => setError('Could not load students.'))
      .finally(() => setLoading(false));
  }, [sessionId, levelId, query, completedFilter, allergiesOnly, page, rowsPerPage]);

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

  const fetchAllMatching = async (): Promise<StudentRow[]> => {
    const all: StudentRow[] = [];
    const perPage = 100;
    let pageNum = 1;
    for (;;) {
      const params = buildFilterParams();
      params.set('page', String(pageNum));
      params.set('per_page', String(perPage));
      const r = await apiJson<{ data: StudentRow[]; meta: ListMeta }>(
        `/api/v1/admin/registrations?${params}`,
      );
      all.push(...r.data);
      if (r.data.length === 0 || pageNum >= r.meta.last_page) break;
      pageNum += 1;
    }
    return all;
  };

  const printIdCards = async () => {
    setPrinting(true);
    setError(null);
    try {
      const students = await fetchAllMatching();
      if (students.length === 0) {
        setError('No students match your filters, so there are no ID cards to print.');
        return;
      }
      const tierName = levelId !== '' ? levels.find((l) => l.id === levelId)?.name : undefined;
      const scope = (tierName ?? 'all-tiers')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const date = new Date().toISOString().slice(0, 10);
      const { generateIdCardsPdf } = await import('./idCards');
      await generateIdCardsPdf(
        students.map((s) => ({
          registration_number: s.registration_number,
          full_name: s.full_name,
          level_name: s.level_name,
          session_name: s.session_name,
        })),
        `jbs-id-cards-${scope || 'students'}-${date}.pdf`,
      );
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setPrinting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Students"
        subtitle="View registration details, attendance and test progress, and mark tier completion for statement and certificate access."
        action={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="outlined"
              startIcon={<BadgeOutlinedIcon />}
              onClick={() => void printIdCards()}
              disabled={printing}
            >
              {printing ? 'Preparing…' : 'Print ID cards'}
            </Button>
            {isAdmin && (
              <Button
                variant="outlined"
                startIcon={<FileDownloadOutlinedIcon />}
                onClick={() => void exportCsv()}
                disabled={exporting}
              >
                {exporting ? 'Exporting…' : 'Export CSV'}
              </Button>
            )}
          </Stack>
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
            onChange={(e) => {
              setSessionId(e.target.value === '' ? '' : Number(e.target.value));
              resetPage();
            }}
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
            onChange={(e) => {
              setLevelId(e.target.value === '' ? '' : Number(e.target.value));
              resetPage();
            }}
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
            onChange={(e) => {
              setCompletedFilter(e.target.value as '' | 'yes' | 'no');
              resetPage();
            }}
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
            onChange={(e) => {
              setAllergiesOnly(e.target.value === 'yes');
              resetPage();
            }}
            fullWidth
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="yes">With allergies / medical</MenuItem>
          </TextField>
          <TextField
            label="Search"
            size="small"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetPage();
            }}
            placeholder="Name, email, reg #"
            fullWidth
            sx={{ gridColumn: '1 / -1' }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          “Print ID cards” builds an A4 PDF (9 cards per page) for every student matching these
          filters — select a tier to print that tier only.
        </Typography>
      </Paper>

      <Paper sx={{ p: { xs: 2, md: 0 }, overflow: 'hidden' }}>
        <ResponsiveTableLayout
          isEmpty={!loading && rows.length === 0}
          empty={<EmptyTableMessage>No students match your filters.</EmptyTableMessage>}
          table={
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Tier</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Allergies / medical</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography color="text.secondary" sx={{ py: 2 }}>
                          Loading students…
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => <StudentTableRow key={row.id} row={row} />)
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          }
          cards={
            loading ? (
              <Typography color="text.secondary" sx={{ py: 1 }}>
                Loading students…
              </Typography>
            ) : (
              rows.map((row) => <StudentCard key={row.id} row={row} />)
            )
          }
        />
        <TablePagination
          component="div"
          count={meta.total}
          page={page}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          labelDisplayedRows={({ from, to, count }) =>
            count === 0 ? '0 students' : `${from}–${to} of ${count}`
          }
          sx={{
            borderTop: 1,
            borderColor: 'divider',
            px: { xs: 0, md: 2 },
            '.MuiTablePagination-toolbar': {
              flexWrap: 'wrap',
              gap: 1,
              px: { xs: 0, md: 2 },
            },
            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
              m: 0,
            },
          }}
        />
      </Paper>
    </>
  );
}
