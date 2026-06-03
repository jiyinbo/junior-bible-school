import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Collapse,
  IconButton,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { Dayjs } from 'dayjs';
import { DatePickerField } from '../../components/DatePickerField';
import {
  DetailRow,
  ListCard,
  ResponsiveTableLayout,
} from '../../components/ResponsiveTableLayout';
import { apiJson, parseApiError } from '../../api/http';
import { PageHeader } from '../../staff/PageHeader';

type AuditRow = {
  id: number;
  created_at: string | null;
  action: string;
  status: string;
  actor_name: string | null;
  user_role: string | null;
  user_id: number | null;
  subject_label: string | null;
  subject_type: string | null;
  subject_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  http_method: string | null;
  route: string | null;
};

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function actionLabel(action: string): string {
  return action
    .split('.')
    .map((part) => part.replace(/_/g, ' '))
    .join(' · ');
}

function hasAuditDetails(row: AuditRow): boolean {
  return Boolean(
    row.old_values ||
      row.new_values ||
      row.metadata ||
      row.route ||
      row.http_method,
  );
}

function JsonBlock({ label, value }: { label: string; value: Record<string, unknown> | null }) {
  if (!value || Object.keys(value).length === 0) return null;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          bgcolor: 'action.hover',
          borderRadius: 1,
          fontSize: '0.75rem',
          overflow: 'auto',
          maxHeight: 200,
          maxWidth: '100%',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
        }}
      >
        {JSON.stringify(value, null, 2)}
      </Box>
    </Box>
  );
}

function AuditLogDetails({ row }: { row: AuditRow }) {
  return (
    <Stack spacing={1.5} sx={{ py: 2 }}>
      {(row.http_method || row.route) && (
        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
          {[row.http_method, row.route].filter(Boolean).join(' ')}
        </Typography>
      )}
      <JsonBlock label="Before" value={row.old_values} />
      <JsonBlock label="After" value={row.new_values} />
      <JsonBlock label="Details" value={row.metadata} />
    </Stack>
  );
}

function AuditExpandButton({
  open,
  hasDetails,
  onToggle,
}: {
  open: boolean;
  hasDetails: boolean;
  onToggle: () => void;
}) {
  if (!hasDetails) return null;
  return (
    <IconButton
      size="small"
      onClick={onToggle}
      aria-expanded={open}
      aria-label="Show details"
      sx={{ transform: open ? 'rotate(180deg)' : undefined }}
    >
      <ExpandMoreIcon fontSize="small" />
    </IconButton>
  );
}

function AuditLogEntry({ row, layout }: { row: AuditRow; layout: 'table' | 'card' }) {
  const [open, setOpen] = useState(false);
  const hasDetails = hasAuditDetails(row);
  const toggle = () => setOpen((o) => !o);

  if (layout === 'card') {
    return (
      <ListCard
        action={<AuditExpandButton open={open} hasDetails={hasDetails} onToggle={toggle} />}
      >
        <Typography variant="body2" color="text.secondary">
          {formatWhen(row.created_at)}
        </Typography>
        <Chip
          label={actionLabel(row.action)}
          size="small"
          variant="outlined"
          sx={{ mt: 1, alignSelf: 'flex-start' }}
        />
        <Stack spacing={0.25} sx={{ mt: 1.5 }}>
          <DetailRow label="Who">
            <Box>
              <Typography variant="body2">{row.actor_name ?? '—'}</Typography>
              {row.user_role ? (
                <Typography variant="caption" color="text.secondary">
                  {row.user_role}
                </Typography>
              ) : null}
            </Box>
          </DetailRow>
          <DetailRow label="Subject">
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2">{row.subject_label ?? '—'}</Typography>
              {row.subject_type ? (
                <Typography variant="caption" color="text.secondary" display="block">
                  {row.subject_type}
                  {row.subject_id != null ? ` #${row.subject_id}` : ''}
                </Typography>
              ) : null}
            </Box>
          </DetailRow>
        </Stack>
        {hasDetails ? (
          <Collapse in={open}>
            <AuditLogDetails row={row} />
          </Collapse>
        ) : null}
      </ListCard>
    );
  }

  return (
    <>
      <TableRow hover>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatWhen(row.created_at)}</TableCell>
        <TableCell>
          <Typography variant="body2">{row.actor_name ?? '—'}</Typography>
          {row.user_role ? (
            <Typography variant="caption" color="text.secondary">
              {row.user_role}
            </Typography>
          ) : null}
        </TableCell>
        <TableCell>
          <Chip label={actionLabel(row.action)} size="small" variant="outlined" />
        </TableCell>
        <TableCell>
          <Typography variant="body2">{row.subject_label ?? '—'}</Typography>
          {row.subject_type ? (
            <Typography variant="caption" color="text.secondary">
              {row.subject_type}
              {row.subject_id != null ? ` #${row.subject_id}` : ''}
            </Typography>
          ) : null}
        </TableCell>
        <TableCell align="right" width={48}>
          <AuditExpandButton open={open} hasDetails={hasDetails} onToggle={toggle} />
        </TableCell>
      </TableRow>
      {hasDetails ? (
        <TableRow>
          <TableCell colSpan={5} sx={{ py: 0, borderBottom: open ? undefined : 0 }}>
            <Collapse in={open}>
              <AuditLogDetails row={row} />
            </Collapse>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

export function AuditLogsPage() {
  const [actions, setActions] = useState<string[]>([]);
  const [action, setAction] = useState('');
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState<Dayjs | null>(null);
  const [toDate, setToDate] = useState<Dayjs | null>(null);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiJson<{ data: string[] }>('/api/v1/admin/audit-logs/actions')
      .then((r) => setActions(r.data))
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (action) params.set('action', action);
    if (query.trim()) params.set('q', query.trim());
    if (fromDate) params.set('from', fromDate.format('YYYY-MM-DD'));
    if (toDate) params.set('to', toDate.format('YYYY-MM-DD'));
    const q = params.toString() ? `?${params}` : '';
    apiJson<{ data: AuditRow[] }>(`/api/v1/admin/audit-logs${q}`)
      .then((r) => {
        setRows(r.data);
        setError(null);
      })
      .catch((e) => setError(parseApiError(e)))
      .finally(() => setLoading(false));
  }, [action, query, fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  const emptyMessage = loading ? 'Loading…' : 'No activity recorded yet.';
  const showList = rows.length > 0;

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Activity log"
        subtitle="Who did what and when — logins, registrations, scores, documents, and other staff actions."
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper sx={{ p: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ md: 'flex-end' }}
        >
          <TextField
            select
            label="Action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            size="small"
            fullWidth
            sx={{ maxWidth: { md: 220 } }}
          >
            <MenuItem value="">All actions</MenuItem>
            {actions.map((a) => (
              <MenuItem key={a} value={a}>
                {actionLabel(a)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Search"
            placeholder="Actor, subject, action…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="small"
            fullWidth
          />
          <Box sx={{ minWidth: { xs: '100%', md: 168 } }}>
            <DatePickerField
              label="From"
              value={fromDate}
              onChange={setFromDate}
              maxDate={toDate ?? undefined}
              size="small"
            />
          </Box>
          <Box sx={{ minWidth: { xs: '100%', md: 168 } }}>
            <DatePickerField
              label="To"
              value={toDate}
              onChange={setToDate}
              minDate={fromDate ?? undefined}
              size="small"
            />
          </Box>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
          Showing up to 300 most recent entries. Filters apply when you change them.
        </Typography>
      </Paper>

      <Paper sx={{ p: { xs: 2, md: 0 }, overflow: 'hidden' }}>
        {!showList ? (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            {emptyMessage}
          </Typography>
        ) : (
          <ResponsiveTableLayout
            table={
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>When</TableCell>
                    <TableCell>Who</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <AuditLogEntry key={row.id} row={row} layout="table" />
                  ))}
                </TableBody>
              </Table>
            }
            cards={rows.map((row) => (
              <AuditLogEntry key={row.id} row={row} layout="card" />
            ))}
          />
        )}
      </Paper>
    </Stack>
  );
}
