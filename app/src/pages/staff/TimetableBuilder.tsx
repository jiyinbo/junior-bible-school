import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
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
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { apiJson, downloadPdfGet, parseApiError } from '../../api/http';
import { toastSuccess } from '../../feedback/toast';
import {
  TimetableGrid,
  type TimetableGridData,
  type TimetablePeriod,
} from '../../components/TimetableGrid';

type Props = {
  sessionId: number;
  tiers: { id: number; name: string }[];
  canManage: boolean;
};

type CellTarget = {
  dayId: number;
  periodId: number;
  mode: 'module' | 'activity' | 'empty';
  moduleId: number | '';
  label: string;
  span: number;
};

type PeriodDraft = {
  id: number | null;
  start_time: string;
  end_time: string;
  kind: 'teaching' | 'activity';
  label: string;
  applies_all_days: boolean;
};

const emptyPeriodDraft: PeriodDraft = {
  id: null,
  start_time: '',
  end_time: '',
  kind: 'teaching',
  label: '',
  applies_all_days: false,
};

export function TimetableBuilder({ sessionId, tiers, canManage }: Props) {
  const [tierId, setTierId] = useState<number | ''>(tiers[0]?.id ?? '');
  const [grid, setGrid] = useState<TimetableGridData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cell, setCell] = useState<CellTarget | null>(null);
  const [period, setPeriod] = useState<PeriodDraft | null>(null);
  const [newDay, setNewDay] = useState('');

  const load = useCallback(() => {
    if (tierId === '') return;
    setLoading(true);
    apiJson<{ data: TimetableGridData }>(`/api/v1/admin/levels/${tierId}/timetable`)
      .then((r) => {
        setGrid(r.data);
        setError(null);
      })
      .catch((e) => setError(parseApiError(e)))
      .finally(() => setLoading(false));
  }, [tierId]);

  useEffect(() => {
    load();
  }, [load]);

  const entriesByCell = useMemo(() => {
    const map = new Map<string, NonNullable<TimetableGridData['entries']>[number]>();
    for (const e of grid?.entries ?? []) {
      map.set(`${e.day_id}:${e.period_id}`, e);
    }
    return map;
  }, [grid]);

  const exportPdf = async () => {
    if (tierId === '') return;
    try {
      await downloadPdfGet(`/api/v1/admin/levels/${tierId}/timetable/pdf`, `jbs-timetable-${tierId}.pdf`);
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const seedTemplate = async () => {
    try {
      await apiJson(`/api/v1/admin/sessions/${sessionId}/timetable/seed`, { method: 'POST' });
      toastSuccess('Standard day template loaded.');
      load();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const savePeriod = async () => {
    if (!period) return;
    const payload = {
      start_time: period.start_time || null,
      end_time: period.end_time || null,
      kind: period.kind,
      label: period.label.trim() || null,
      applies_all_days: period.applies_all_days,
    };
    try {
      if (period.id) {
        await apiJson(`/api/v1/admin/timetable/periods/${period.id}`, { method: 'PATCH', json: payload });
      } else {
        await apiJson(`/api/v1/admin/sessions/${sessionId}/timetable/periods`, { method: 'POST', json: payload });
      }
      toastSuccess('Column saved.');
      setPeriod(null);
      load();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const deletePeriod = async (id: number) => {
    try {
      await apiJson(`/api/v1/admin/timetable/periods/${id}`, { method: 'DELETE' });
      toastSuccess('Column removed.');
      load();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const addDay = async () => {
    if (!newDay) return;
    try {
      await apiJson(`/api/v1/admin/sessions/${sessionId}/timetable/days`, {
        method: 'POST',
        json: { day_date: newDay },
      });
      toastSuccess('Day added.');
      setNewDay('');
      load();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const deleteDay = async (id: number) => {
    try {
      await apiJson(`/api/v1/admin/timetable/days/${id}`, { method: 'DELETE' });
      toastSuccess('Day removed.');
      load();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const saveCell = async () => {
    if (!cell || tierId === '') return;
    const json: Record<string, unknown> = {
      jbs_timetable_day_id: cell.dayId,
      jbs_timetable_period_id: cell.periodId,
      span: cell.span,
    };
    if (cell.mode === 'module') {
      json.jbs_module_id = cell.moduleId === '' ? null : cell.moduleId;
    } else if (cell.mode === 'activity') {
      json.activity_label = cell.label.trim();
    }
    try {
      const r = await apiJson<{ data: TimetableGridData }>(`/api/v1/admin/levels/${tierId}/timetable/entry`, {
        method: 'PATCH',
        json,
      });
      setGrid(r.data);
      setCell(null);
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const openCell = (dayId: number, p: TimetablePeriod) => {
    if (!canManage) return;
    const existing = entriesByCell.get(`${dayId}:${p.id}`);
    setCell({
      dayId,
      periodId: p.id,
      mode: existing ? (existing.module_id ? 'module' : 'activity') : p.kind === 'activity' ? 'activity' : 'module',
      moduleId: existing?.module_id ?? '',
      label: existing?.activity_label ?? (existing ? '' : p.applies_all_days ? p.label ?? '' : ''),
      span: existing?.span ?? 1,
    });
  };

  if (tiers.length === 0) {
    return <Alert severity="info">Add a tier first — timetables are built per tier.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <TextField
          select
          label="Tier"
          value={tierId}
          onChange={(e) => setTierId(Number(e.target.value))}
          size="small"
          sx={{ minWidth: 200 }}
        >
          {tiers.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.name}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ flex: 1 }} />
        <Button startIcon={<PictureAsPdfIcon />} onClick={() => void exportPdf()} disabled={tierId === ''}>
          Export PDF
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {canManage && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>Day &amp; time-column setup</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">Time columns</Typography>
                  <Stack direction="row" spacing={1}>
                    {(grid?.periods.length ?? 0) === 0 && (
                      <Button size="small" onClick={() => void seedTemplate()}>
                        Load standard template
                      </Button>
                    )}
                    <Button size="small" variant="outlined" onClick={() => setPeriod(emptyPeriodDraft)}>
                      Add column
                    </Button>
                  </Stack>
                </Stack>
                {(grid?.periods.length ?? 0) === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No columns yet. Load the standard template or add columns to define the school day.
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Activity label</TableCell>
                        <TableCell>All days</TableCell>
                        <TableCell align="right" />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {grid?.periods.map((p) => (
                        <TableRow key={p.id} hover sx={{ cursor: 'pointer' }}>
                          <TableCell onClick={() => setPeriod(toDraft(p))}>{p.time_label ?? '—'}</TableCell>
                          <TableCell onClick={() => setPeriod(toDraft(p))}>{p.kind}</TableCell>
                          <TableCell onClick={() => setPeriod(toDraft(p))}>{p.label ?? '—'}</TableCell>
                          <TableCell onClick={() => setPeriod(toDraft(p))}>{p.applies_all_days ? 'Yes' : '—'}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" color="error" onClick={() => void deletePeriod(p.id)}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Days (rows)
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                  {grid?.days.map((d) => (
                    <Chip
                      key={d.id}
                      label={`${d.weekday_label} ${d.date_label}`}
                      onDelete={() => void deleteDay(d.id)}
                      size="small"
                    />
                  ))}
                  {(grid?.days.length ?? 0) === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No days yet — add the dates the school runs.
                    </Typography>
                  )}
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    type="date"
                    size="small"
                    label="Add day"
                    value={newDay}
                    onChange={(e) => setNewDay(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <Button size="small" onClick={() => void addDay()} disabled={!newDay}>
                    Add
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {loading && <Typography color="text.secondary">Loading…</Typography>}

      {grid && !canManage && <TimetableGrid grid={grid} />}

      {grid && canManage && (
        <Paper variant="outlined" sx={{ p: 1 }}>
          {grid.periods.length === 0 || grid.days.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 2 }}>
              Define at least one time column and one day above to start placing modules.
            </Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Click any cell to place a module or activity. All-day columns show their default label until overridden.
              </Typography>
              <Table
                size="small"
                sx={{
                  minWidth: 720,
                  tableLayout: 'fixed',
                  '& td, & th': {
                    border: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'center',
                    px: 0.5,
                    py: 0.5,
                    fontSize: '0.7rem',
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 700, minWidth: 84 }}>Date / Time</TableCell>
                    {grid.periods.map((p) => (
                      <TableCell key={p.id} sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                        {p.time_label ?? '—'}
                        {p.label && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {p.label}
                          </Typography>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {grid.days.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {d.date_label}
                      </TableCell>
                      {grid.periods.map((p) => {
                        const e = entriesByCell.get(`${d.id}:${p.id}`);
                        const content = e?.code ?? e?.activity_label ?? (p.applies_all_days ? p.label : '');
                        const placeholder = !e && p.applies_all_days;
                        return (
                          <Tooltip key={p.id} title={e?.name ?? ''} disableHoverListener={!e?.name}>
                            <TableCell
                              onClick={() => openCell(d.id, p)}
                              sx={{
                                cursor: 'pointer',
                                bgcolor: e?.module_id
                                  ? 'transparent'
                                  : e?.activity_label || placeholder
                                    ? '#dce7f3'
                                    : 'transparent',
                                color: placeholder ? 'text.disabled' : 'text.primary',
                                fontWeight: e ? 700 : 400,
                                '&:hover': { outline: '2px solid', outlineColor: 'primary.light' },
                              }}
                            >
                              {content || '+'}
                              {e && e.span > 1 && (
                                <Typography variant="caption" display="block" color="text.secondary">
                                  ×{e.span}
                                </Typography>
                              )}
                            </TableCell>
                          </Tooltip>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>
      )}

      {/* Cell editor */}
      <Dialog open={cell !== null} onClose={() => setCell(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Timetable cell</DialogTitle>
        <DialogContent>
          {cell && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                select
                label="Content"
                value={cell.mode}
                onChange={(e) => setCell({ ...cell, mode: e.target.value as CellTarget['mode'] })}
                size="small"
                fullWidth
              >
                <MenuItem value="module">Module</MenuItem>
                <MenuItem value="activity">Activity (e.g. TEST)</MenuItem>
                <MenuItem value="empty">Clear cell</MenuItem>
              </TextField>
              {cell.mode === 'module' && (
                <TextField
                  select
                  label="Module"
                  value={cell.moduleId}
                  onChange={(e) => setCell({ ...cell, moduleId: e.target.value === '' ? '' : Number(e.target.value) })}
                  size="small"
                  fullWidth
                  helperText={grid?.legend.length ? undefined : 'No modules in this tier yet.'}
                >
                  {grid?.legend.map((m) => (
                    <MenuItem key={m.module_id} value={m.module_id}>
                      {m.code ? `${m.code} — ${m.name}` : m.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              {cell.mode === 'activity' && (
                <TextField
                  label="Activity label"
                  value={cell.label}
                  onChange={(e) => setCell({ ...cell, label: e.target.value })}
                  size="small"
                  fullWidth
                  placeholder="TEST, INTERACTIVE SESSION…"
                />
              )}
              {cell.mode !== 'empty' && (
                <TextField
                  type="number"
                  label="Spans columns"
                  value={cell.span}
                  onChange={(e) => setCell({ ...cell, span: Math.max(1, Number(e.target.value) || 1) })}
                  size="small"
                  inputProps={{ min: 1, max: 30 }}
                  helperText="How many time columns this cell covers (1 = single)."
                />
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCell(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveCell()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Period editor */}
      <Dialog open={period !== null} onClose={() => setPeriod(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{period?.id ? 'Edit column' : 'Add column'}</DialogTitle>
        <DialogContent>
          {period && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={2}>
                <TextField
                  type="time"
                  label="Start"
                  value={period.start_time}
                  onChange={(e) => setPeriod({ ...period, start_time: e.target.value })}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  type="time"
                  label="End"
                  value={period.end_time}
                  onChange={(e) => setPeriod({ ...period, end_time: e.target.value })}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Stack>
              <TextField
                select
                label="Type"
                value={period.kind}
                onChange={(e) => setPeriod({ ...period, kind: e.target.value as PeriodDraft['kind'] })}
                size="small"
                fullWidth
              >
                <MenuItem value="teaching">Teaching (modules placed per day)</MenuItem>
                <MenuItem value="activity">Activity (fixed block)</MenuItem>
              </TextField>
              <TextField
                label="Activity label"
                value={period.label}
                onChange={(e) => setPeriod({ ...period, label: e.target.value })}
                size="small"
                fullWidth
                placeholder="DEVOTION, BREAK, LUNCH…"
                helperText="Shown in the cell for activity columns."
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={period.applies_all_days}
                    onChange={(e) => setPeriod({ ...period, applies_all_days: e.target.checked })}
                  />
                }
                label="Same on every day (fills the whole column)"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPeriod(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void savePeriod()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function toDraft(p: TimetablePeriod): PeriodDraft {
  return {
    id: p.id,
    start_time: p.start_time ?? '',
    end_time: p.end_time ?? '',
    kind: p.kind,
    label: p.label ?? '',
    applies_all_days: p.applies_all_days,
  };
}
