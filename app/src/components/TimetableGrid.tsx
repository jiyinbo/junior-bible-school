import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

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

function cellBg(cell: TimetableCell): string | undefined {
  if (cell.type === 'module') return undefined;
  if (cell.type === 'empty') return undefined;
  return cell.structural ? '#eef0f2' : '#dce7f3';
}

export function TimetableGrid({ grid }: { grid: TimetableGridData }) {
  if (grid.periods.length === 0) {
    return <Typography color="text.secondary">No timetable columns defined yet.</Typography>;
  }
  if (grid.days.length === 0) {
    return <Typography color="text.secondary">No timetable days yet.</Typography>;
  }

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

      {grid.legend.length > 0 && (
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
              {grid.legend.map((item, i) => (
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
      )}
    </Box>
  );
}
