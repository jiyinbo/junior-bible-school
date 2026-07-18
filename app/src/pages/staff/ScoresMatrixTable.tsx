import { useMemo, useState } from 'react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  formatModuleCell,
  formatOverall,
  moduleHeading,
  type TierModule,
  type TierStudentRow,
} from './scoresShared';

type SortKey = 'name' | 'overall' | `module:${number}`;
type SortDir = 'asc' | 'desc';

type Props = {
  modules: TierModule[];
  students: TierStudentRow[];
};

function compareNullableNumber(a: number | null, b: number | null, dir: SortDir): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const cmp = a - b;
  return dir === 'asc' ? cmp : -cmp;
}

function compareString(a: string, b: string, dir: SortDir): number {
  const cmp = a.localeCompare(b, undefined, { sensitivity: 'base' });
  return dir === 'asc' ? cmp : -cmp;
}

export function ScoresMatrixTable({ modules, students }: Props) {
  const theme = useTheme();
  const useShortHeadings = useMediaQuery(theme.breakpoints.down('md'));
  const [query, setQuery] = useState('');
  const [missingOnly, setMissingOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'overall' || key.startsWith('module:') ? 'desc' : 'asc');
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = students;

    if (q) {
      filtered = filtered.filter(
        (s) =>
          s.full_name.toLowerCase().includes(q) ||
          s.registration_number.toLowerCase().includes(q),
      );
    }

    if (missingOnly) {
      filtered = filtered.filter((s) =>
        modules.some((m) => s.modules[String(m.id)] == null),
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === 'name') return compareString(a.full_name, b.full_name, sortDir);
      if (sortKey === 'overall') {
        return compareNullableNumber(a.overall_percent, b.overall_percent, sortDir);
      }
      if (sortKey.startsWith('module:')) {
        const moduleId = sortKey.slice('module:'.length);
        const aPercent = a.modules[moduleId]?.percent ?? null;
        const bPercent = b.modules[moduleId]?.percent ?? null;
        return compareNullableNumber(aPercent, bPercent, sortDir);
      }
      return 0;
    });

    return sorted;
  }, [students, modules, query, missingOnly, sortKey, sortDir]);

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 0 }, overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          px: { xs: 0, md: 2 },
          pt: { xs: 0, md: 2 },
          pb: 1.5,
        }}
      >
        <TextField
          size="small"
          label="Filter students"
          placeholder="Name or registration number"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ minWidth: 220, flex: '1 1 220px' }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={missingOnly}
              onChange={(e) => setMissingOnly(e.target.checked)}
              size="small"
            />
          }
          label="Missing scores only"
        />
      </Box>

      {rows.length === 0 ? (
        <Typography color="text.secondary" sx={{ px: { xs: 0, md: 2 }, pb: 2.5 }}>
          {students.length === 0
            ? 'No students registered in this tier.'
            : 'No students match the current filters.'}
        </Typography>
      ) : (
        <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 3,
                    bgcolor: 'background.paper',
                    minWidth: 140,
                  }}
                >
                  <TableSortLabel
                    active={sortKey === 'name'}
                    direction={sortKey === 'name' ? sortDir : 'asc'}
                    onClick={() => toggleSort('name')}
                  >
                    Student
                  </TableSortLabel>
                </TableCell>
                {modules.map((module) => {
                  const key: SortKey = `module:${module.id}`;
                  return (
                    <TableCell
                      key={module.id}
                      align="right"
                      sx={{ minWidth: useShortHeadings ? 64 : 96, whiteSpace: 'nowrap' }}
                      title={module.name}
                    >
                      <TableSortLabel
                        active={sortKey === key}
                        direction={sortKey === key ? sortDir : 'desc'}
                        onClick={() => toggleSort(key)}
                      >
                        {moduleHeading(module, useShortHeadings)}
                      </TableSortLabel>
                    </TableCell>
                  );
                })}
                <TableCell align="right" sx={{ minWidth: 200, whiteSpace: 'nowrap' }}>
                  <TableSortLabel
                    active={sortKey === 'overall'}
                    direction={sortKey === 'overall' ? sortDir : 'desc'}
                    onClick={() => toggleSort('overall')}
                  >
                    Overall
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((student) => (
                <TableRow key={student.id} hover>
                  <TableCell
                    sx={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      bgcolor: 'background.paper',
                      minWidth: 140,
                    }}
                  >
                    <Typography variant="body2" fontWeight={500}>
                      {student.full_name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', display: 'block' }}
                    >
                      {student.registration_number}
                    </Typography>
                  </TableCell>
                  {modules.map((module) => (
                    <TableCell
                      key={module.id}
                      align="right"
                      sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
                    >
                      {formatModuleCell(student.modules[String(module.id)] ?? null)}
                    </TableCell>
                  ))}
                  <TableCell
                    align="right"
                    sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontWeight: 500 }}
                  >
                    {formatOverall(student)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
