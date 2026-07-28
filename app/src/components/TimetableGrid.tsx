import { Box, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

export type TimetablePeriod = {
  id: number;
  sort_order: number;
  start_time: string | null;
  end_time: string | null;
  time_label: string | null;
  kind: 'teaching' | 'activity';
  label: string | null;
  applies_all_days: boolean;
};

export type TimetableCell = {
  period_id: number;
  type: 'module' | 'activity' | 'empty';
  code: string | null;
  name: string | null;
  label: string | null;
  teacher_name: string | null;
  module_id: number | null;
  col_span: number;
  row_span: number;
  structural: boolean;
};

export type TimetableRow = {
  day_id: number;
  date: string;
  date_label: string;
  weekday_label: string;
  label: string | null;
  cells: TimetableCell[];
};

export type TimetableEntry = {
  day_id: number;
  period_id: number;
  span: number;
  module_id: number | null;
  code: string | null;
  name: string | null;
  activity_label: string | null;
};

export type TimetableLegendItem = {
  module_id: number;
  code: string | null;
  name: string;
  teacher_name: string | null;
};

export type TimetableGridData = {
  tier: { id: number; name: string };
  session: { id: number; name: string };
  periods: TimetablePeriod[];
  days: { id: number; date: string; date_label: string; weekday_label: string; label: string | null }[];
  rows: TimetableRow[];
  entries?: TimetableEntry[];
  legend: TimetableLegendItem[];
};

type StackedBlock = {
  key: string;
  timeLabel: string;
  title: string;
  subtitle: string | null;
  kind: 'module' | 'activity';
  structural: boolean;
};

function cellBg(cell: TimetableCell): string | undefined {
  if (cell.type === 'module') return undefined;
  if (cell.type === 'empty') return undefined;
  return cell.structural ? '#eef0f2' : '#dce7f3';
}

function formatClock(value: string | null | undefined): string | null {
  if (!value) return null;
  // API may return "09:30:00" or "09:30".
  return value.slice(0, 5);
}

function blockTimeLabel(
  periods: TimetablePeriod[],
  startIndex: number,
  colSpan: number,
): string {
  const start = periods[startIndex];
  const end = periods[Math.min(startIndex + colSpan - 1, periods.length - 1)];
  if (!start) return '';

  const startClock = formatClock(start.start_time) ?? start.time_label ?? '';
  const endClock = formatClock(end?.end_time) ?? formatClock(end?.start_time) ?? end?.time_label ?? '';

  if (startClock && endClock && startClock !== endClock) {
    return `${startClock}–${endClock}`;
  }
  return start.time_label ?? startClock ?? endClock ?? '';
}

function stackedBlocksForRow(row: TimetableRow, periods: TimetablePeriod[]): StackedBlock[] {
  const indexById = new Map(periods.map((period, index) => [period.id, index]));
  const blocks: StackedBlock[] = [];

  for (const cell of row.cells) {
    if (cell.type === 'empty') continue;

    const startIndex = indexById.get(cell.period_id);
    if (startIndex === undefined) continue;

    const span = Math.max(1, cell.col_span || 1);
    const title =
      cell.type === 'module'
        ? (cell.code ?? cell.name ?? 'Module')
        : (cell.label ?? 'Activity');
    const subtitle =
      cell.type === 'module'
        ? [cell.name && cell.code ? cell.name : null, cell.teacher_name].filter(Boolean).join(' · ') ||
          null
        : null;

    blocks.push({
      key: `${row.day_id}-${cell.period_id}`,
      timeLabel: blockTimeLabel(periods, startIndex, span),
      title,
      subtitle,
      kind: cell.type,
      structural: cell.structural,
    });
  }

  return blocks;
}

function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function TimetableLegend({ legend }: { legend: TimetableLegendItem[] }) {
  if (legend.length === 0) return null;

  return (
    <Box sx={{ mt: 2, maxWidth: 560 }}>
      <Typography variant="subtitle2" gutterBottom>
        Courses
      </Typography>
      <Table size="small" sx={{ '& td, & th': { border: '1px solid', borderColor: 'divider' } }}>
        <TableHead>
          <TableRow>
            <TableCell width={48}>S/N</TableCell>
            <TableCell>Course</TableCell>
            <TableCell width={90}>Code</TableCell>
            <TableCell>Lecturer</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {legend.map((item, i) => (
            <TableRow key={item.module_id}>
              <TableCell>{i + 1}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.code ?? '—'}</TableCell>
              <TableCell>{item.teacher_name ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function TimetableMatrix({ grid }: { grid: TimetableGridData }) {
  return (
    <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <Table
        size="small"
        sx={{
          minWidth: 96 + grid.periods.length * 104,
          tableLayout: 'fixed',
          '& td, & th': {
            border: '1px solid',
            borderColor: 'divider',
            textAlign: 'center',
            verticalAlign: 'middle',
            px: 0.75,
            py: 0.75,
            fontSize: '0.72rem',
            lineHeight: 1.2,
            width: 104,
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          },
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell
              sx={{
                bgcolor: 'grey.200',
                fontWeight: 700,
                position: 'sticky',
                left: 0,
                zIndex: 3,
                width: 96,
                boxShadow: '2px 0 4px -2px rgba(0,0,0,0.25)',
              }}
            >
              Date / Time
            </TableCell>
            {grid.periods.map((p) => (
              <TableCell key={p.id} sx={{ bgcolor: 'grey.100', fontWeight: 700 }}>
                {p.time_label ?? ''}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {grid.rows.map((row) => (
            <TableRow key={row.day_id}>
              <TableCell
                sx={{
                  bgcolor: 'grey.100',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  boxShadow: '2px 0 4px -2px rgba(0,0,0,0.25)',
                }}
              >
                {row.date_label}
              </TableCell>
              {row.cells.map((cell) => (
                <TableCell
                  key={`${row.day_id}-${cell.period_id}`}
                  colSpan={cell.col_span > 1 ? cell.col_span : undefined}
                  rowSpan={cell.row_span > 1 ? cell.row_span : undefined}
                  sx={{
                    bgcolor: cellBg(cell),
                    fontWeight: cell.type === 'module' || cell.type === 'activity' ? 700 : 400,
                  }}
                  title={cell.type === 'module' ? cell.name ?? undefined : undefined}
                >
                  {cell.type === 'module' ? cell.code ?? cell.name : cell.type === 'activity' ? cell.label : ''}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <TimetableLegend legend={grid.legend} />
    </Box>
  );
}

function TimetableStacked({ grid }: { grid: TimetableGridData }) {
  const today = todayDateString();

  return (
    <Stack spacing={1.5} sx={{ minWidth: 0, maxWidth: '100%' }}>
      {grid.rows.map((row) => {
        const blocks = stackedBlocksForRow(row, grid.periods);
        const isToday = row.date === today;

        return (
          <Paper
            key={row.day_id}
            variant="outlined"
            sx={{
              p: 1.5,
              borderColor: isToday ? 'primary.main' : 'divider',
              bgcolor: isToday ? 'action.hover' : 'background.paper',
              overflow: 'hidden',
              maxWidth: '100%',
            }}
          >
            <Stack spacing={0.25} sx={{ mb: blocks.length > 0 ? 1.25 : 0 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                {row.weekday_label}
                {row.date_label ? ` · ${row.date_label}` : ''}
                {isToday ? ' · Today' : ''}
              </Typography>
              {row.label ? (
                <Typography variant="caption" color="text.secondary">
                  {row.label}
                </Typography>
              ) : null}
            </Stack>

            {blocks.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No sessions scheduled.
              </Typography>
            ) : (
              <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                {blocks.map((block) => (
                  <Box
                    key={block.key}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(88px, auto) minmax(0, 1fr)',
                      gap: 1,
                      alignItems: 'start',
                      px: 1,
                      py: 0.85,
                      borderRadius: 1,
                      bgcolor:
                        block.kind === 'activity'
                          ? block.structural
                            ? 'grey.100'
                            : 'rgba(25, 118, 210, 0.08)'
                          : 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      sx={{
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        pt: 0.15,
                      }}
                    >
                      {block.timeLabel}
                    </Typography>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} sx={{ wordBreak: 'break-word' }}>
                        {block.title}
                      </Typography>
                      {block.subtitle ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          sx={{ wordBreak: 'break-word' }}
                        >
                          {block.subtitle}
                        </Typography>
                      ) : null}
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        );
      })}

      <TimetableLegend legend={grid.legend} />
    </Stack>
  );
}

export function TimetableGrid({
  grid,
  variant = 'matrix',
}: {
  grid: TimetableGridData;
  variant?: 'matrix' | 'stacked';
}) {
  if (grid.periods.length === 0) {
    return <Typography color="text.secondary">No timetable columns defined yet.</Typography>;
  }
  if (grid.days.length === 0) {
    return <Typography color="text.secondary">No timetable days yet.</Typography>;
  }

  return variant === 'stacked' ? <TimetableStacked grid={grid} /> : <TimetableMatrix grid={grid} />;
}
