import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import type { Dayjs } from "dayjs";
import { FormRowButton, InlineFormRow } from "../../components/InlineFormRow";
import { InlineFieldSave } from "../../components/InlineFieldSave";
import {
  LevelModuleRow,
  MODULE_TABLE_COL_WIDTH,
} from "../../components/LevelModuleRow";
import { DatePickerField } from "../../components/DatePickerField";
import { TimetableBuilder } from "./TimetableBuilder";
import { toastSuccess } from "../../feedback/toast";
import { apiJson, parseApiError } from "../../api/http";
import { PageHeader } from "../../staff/PageHeader";
import { useStaffAuth } from "../../staff/StaffAuthContext";
import {
  parseSessionDate,
  sessionDateToApi,
  type SessionDateField,
} from "../../utils/sessionDates";
import {
  programmeChipColor,
  programmeStatusLabel,
  registrationChipColor,
  registrationStatusLabel,
  testActionLabel,
  testChipColor,
} from "../../utils/sessionStatus";

type StaffUser = { id: number; name: string; email: string; role: string };

type ModuleRow = {
  id: number;
  name: string;
  code: string | null;
  test: { id: number; status: string } | null;
  assigned_teacher: { id: number; name: string } | null;
};

type LevelRow = {
  id: number;
  name: string;
  placement_group: string | null;
  registration_prefix: string;
  modules: ModuleRow[];
};

const PLACEMENT_GROUPS = [
  { value: '', label: 'No placement rule' },
  { value: 'basic_10_12', label: 'Basic (10–12)' },
  { value: 'basic_teens', label: 'Basic (Teens)' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'teens_masterclass', label: 'Teens Masterclass' },
];

type SessionDetail = {
  id: number;
  name: string;
  slug: string;
  is_past: boolean;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  session_starts_at: string | null;
  session_ends_at: string | null;
  levels: LevelRow[];
};

type SessionDates = Record<SessionDateField, Dayjs | null>;

const emptyDates = (): SessionDates => ({
  registration_opens_at: null,
  registration_closes_at: null,
  session_starts_at: null,
  session_ends_at: null,
});

const teachersOnly = (staff: StaffUser[]) =>
  staff.filter((u) => u.role === "teacher");

function TestManageButton({
  moduleId,
  status,
  compact,
}: {
  moduleId: number;
  status?: string;
  compact?: boolean;
}) {
  const label = testActionLabel(status);
  const chipColor = testChipColor(status);
  const variant = status === "open" ? "contained" : "outlined";
  const color =
    chipColor === "success"
      ? "success"
      : chipColor === "warning"
        ? "warning"
        : "primary";

  return (
    <Button
      component={RouterLink}
      to={`/staff/modules/${moduleId}/test`}
      size="small"
      variant={variant}
      color={color}
      startIcon={<EditNoteOutlinedIcon fontSize="inherit" />}
      endIcon={
        compact ? undefined : (
          <ChevronRightIcon sx={{ fontSize: 18, opacity: 0.85 }} />
        )
      }
      sx={{
        textTransform: "none",
        fontWeight: 600,
        whiteSpace: "nowrap",
        px: compact ? 1 : 1.25,
        minWidth: compact ? 0 : undefined,
        height: compact ? 40 : undefined,
        minHeight: compact ? 40 : undefined,
        boxShadow: variant === "outlined" ? 1 : undefined,
        "&:hover": { boxShadow: 2 },
      }}
    >
      {label}
    </Button>
  );
}

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { isAdmin } = useStaffAuth();
  const canManage = isAdmin;
  const [tab, setTab] = useState(0);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [assigningModuleId, setAssigningModuleId] = useState<number | null>(
    null,
  );
  const [modulePendingDelete, setModulePendingDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [deletingModuleId, setDeletingModuleId] = useState<number | null>(null);

  const [levelName, setLevelName] = useState("");
  const [levelPrefix, setLevelPrefix] = useState("");
  const [levelPlacementGroup, setLevelPlacementGroup] = useState("");
  const [moduleNames, setModuleNames] = useState<Record<number, string>>({});
  const [moduleCodes, setModuleCodes] = useState<Record<number, string>>({});
  const [expandedLevels, setExpandedLevels] = useState<Record<number, boolean>>(
    {},
  );

  const [dates, setDates] = useState<SessionDates>(emptyDates);
  const [isPast, setIsPast] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [sessionSlug, setSessionSlug] = useState("");

  const setDate = (field: SessionDateField, value: Dayjs | null) => {
    setDates((d) => ({ ...d, [field]: value }));
  };

  const loadSession = useCallback(() => {
    if (!sessionId) return;
    apiJson<{ data: SessionDetail }>(`/api/v1/admin/sessions/${sessionId}`)
      .then((r) => {
        setSession(r.data);
        setDates({
          registration_opens_at: parseSessionDate(r.data.registration_opens_at),
          registration_closes_at: parseSessionDate(
            r.data.registration_closes_at,
          ),
          session_starts_at: parseSessionDate(r.data.session_starts_at),
          session_ends_at: parseSessionDate(r.data.session_ends_at),
        });
        setIsPast(r.data.is_past);
        setSessionName(r.data.name);
        setSessionSlug(r.data.slug);
        setExpandedLevels((prev) => {
          const next = { ...prev };
          for (const level of r.data.levels) {
            if (next[level.id] === undefined) next[level.id] = true;
          }
          return next;
        });
        setError(null);
      })
      .catch(() => setError("Could not load session."));
  }, [sessionId]);

  useEffect(() => {
    loadSession();
    apiJson<{ data: StaffUser[] }>("/api/v1/admin/staff-users")
      .then((r) => setStaff(r.data))
      .catch(() => {});
  }, [loadSession]);

  const stats = useMemo(() => {
    if (!session) return { levels: 0, modules: 0, assigned: 0, openTests: 0 };
    const modules = session.levels.flatMap((l) => l.modules);
    return {
      levels: session.levels.length,
      modules: modules.length,
      assigned: modules.filter((m) => m.assigned_teacher).length,
      openTests: modules.filter((m) => m.test?.status === "open").length,
    };
  }, [session]);

  const saveSettings = async () => {
    if (!sessionId) return;
    setSavingSettings(true);
    setError(null);
    try {
      await apiJson(`/api/v1/admin/sessions/${sessionId}`, {
        method: "PATCH",
        json: {
          name: sessionName.trim(),
          slug: sessionSlug.trim() || undefined,
          registration_opens_at: sessionDateToApi(
            "registration_opens_at",
            dates.registration_opens_at,
          ),
          registration_closes_at: sessionDateToApi(
            "registration_closes_at",
            dates.registration_closes_at,
          ),
          session_starts_at: sessionDateToApi(
            "session_starts_at",
            dates.session_starts_at,
          ),
          session_ends_at: sessionDateToApi(
            "session_ends_at",
            dates.session_ends_at,
          ),
          is_past: isPast,
        },
      });
      toastSuccess("Session settings saved.");
      loadSession();
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setSavingSettings(false);
    }
  };

  const addLevel = async () => {
    if (!sessionId || !levelName.trim()) return;
    setError(null);
    try {
      await apiJson(`/api/v1/admin/sessions/${sessionId}/levels`, {
        method: "POST",
        json: {
          name: levelName.trim(),
          registration_prefix: levelPrefix.trim() || "L",
          placement_group: levelPlacementGroup || null,
        },
      });
      setLevelName("");
      setLevelPrefix("");
      setLevelPlacementGroup("");
      toastSuccess("Tier added.");
      setTab(1);
      loadSession();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const addModule = async (levelId: number) => {
    const name = (moduleNames[levelId] ?? "").trim();
    if (!name) return;
    const code = (moduleCodes[levelId] ?? "").trim();
    setError(null);
    try {
      await apiJson(`/api/v1/admin/levels/${levelId}/modules`, {
        method: "POST",
        json: { name, code: code || null },
      });
      setModuleNames((m) => ({ ...m, [levelId]: "" }));
      setModuleCodes((m) => ({ ...m, [levelId]: "" }));
      toastSuccess("Module added.");
      loadSession();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const updateLevel = async (
    levelId: number,
    name: string,
    registration_prefix: string,
  ) => {
    setError(null);
    try {
      await apiJson(`/api/v1/admin/levels/${levelId}`, {
        method: "PATCH",
        json: { name, registration_prefix },
      });
      toastSuccess("Tier updated.");
      loadSession();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const updateModule = async (
    moduleId: number,
    patch: { name?: string; code?: string },
  ) => {
    setError(null);
    try {
      await apiJson(`/api/v1/admin/modules/${moduleId}`, {
        method: "PATCH",
        json: patch,
      });
      toastSuccess("Module updated.");
      loadSession();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const assignTeacher = async (moduleId: number, userId: number) => {
    setAssigningModuleId(moduleId);
    setError(null);
    try {
      await apiJson(`/api/v1/admin/modules/${moduleId}/assignment`, {
        method: "POST",
        json: { user_id: userId },
      });
      toastSuccess("Teacher assigned.");
      loadSession();
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setAssigningModuleId(null);
    }
  };

  const confirmDeleteModule = async () => {
    if (!modulePendingDelete) return;
    setDeletingModuleId(modulePendingDelete.id);
    setError(null);
    try {
      await apiJson(`/api/v1/admin/modules/${modulePendingDelete.id}`, {
        method: "DELETE",
      });
      toastSuccess("Module deleted.");
      setModulePendingDelete(null);
      loadSession();
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setDeletingModuleId(null);
    }
  };

  if (!sessionId) return null;

  const teacherOptions = teachersOnly(staff);

  return (
    <>
      <Button
        component={RouterLink}
        to="/staff/sessions"
        size="small"
        sx={{ mb: 2 }}
      >
        ← Sessions
      </Button>
      <PageHeader
        title={session?.name ?? "Session"}
        subtitle={session ? `Slug: ${session.slug}` : undefined}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          sx={{ mb: session ? 1.5 : 0 }}
        >
          <Chip
            size="small"
            label={registrationStatusLabel(dates, isPast)}
            color={registrationChipColor(dates, isPast)}
          />
          <Chip
            size="small"
            label={programmeStatusLabel(dates, isPast)}
            color={programmeChipColor(dates, isPast)}
          />
          {session && (
            <>
              <Chip
                size="small"
                variant="outlined"
                label={`${stats.levels} tiers`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`${stats.modules} modules`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`${stats.assigned}/${stats.modules} teachers assigned`}
              />
              {stats.openTests > 0 && (
                <Chip
                  size="small"
                  color="success"
                  variant="outlined"
                  label={`${stats.openTests} open tests`}
                />
              )}
            </>
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {canManage ? (
            <>
              Add tiers and modules under <strong>Curriculum</strong>. Build the
              day-by-day timetable under <strong>Timetable</strong>.
            </>
          ) : (
            <>Viewing tiers, modules and teachers for this session (read-only). Use the Timetable tab for the schedule.</>
          )}
        </Typography>
      </Paper>

      {canManage && (
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Settings" />
          <Tab label={`Curriculum${session ? ` (${stats.levels} tiers)` : ""}`} />
          <Tab label="Timetable" />
        </Tabs>
      )}

      {canManage && tab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Dates & status
          </Typography>
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Session name"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="URL slug"
                  value={sessionSlug}
                  onChange={(e) => setSessionSlug(e.target.value)}
                  fullWidth
                  helperText="Used for public registration links"
                />
              </Grid>
            </Grid>
            <Typography variant="subtitle2" color="text.secondary">
              Registration window
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <DatePickerField
                  label="Registration opens"
                  value={dates.registration_opens_at}
                  onChange={(v) => setDate("registration_opens_at", v)}
                  maxDate={dates.registration_closes_at ?? undefined}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <DatePickerField
                  label="Registration closes"
                  value={dates.registration_closes_at}
                  onChange={(v) => setDate("registration_closes_at", v)}
                  minDate={dates.registration_opens_at ?? undefined}
                />
              </Grid>
            </Grid>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ pt: 1 }}
            >
              Session dates (attendance and module timetable slots must fall
              within this range)
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <DatePickerField
                  label="Session starts"
                  value={dates.session_starts_at}
                  onChange={(v) => setDate("session_starts_at", v)}
                  maxDate={dates.session_ends_at ?? undefined}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <DatePickerField
                  label="Session ends"
                  value={dates.session_ends_at}
                  onChange={(v) => setDate("session_ends_at", v)}
                  minDate={dates.session_starts_at ?? undefined}
                />
              </Grid>
            </Grid>
            <FormControlLabel
              control={
                <Switch
                  checked={isPast}
                  onChange={(e) => setIsPast(e.target.checked)}
                />
              }
              label="Mark as past session"
            />
            <Button
              variant="contained"
              onClick={() => void saveSettings()}
              disabled={savingSettings}
              sx={{ alignSelf: "flex-start" }}
            >
              {savingSettings ? "Saving…" : "Save settings"}
            </Button>
          </Stack>
        </Paper>
      )}

      {(!canManage || tab === 1) && (
        <Stack spacing={2}>
          {canManage && !dates.session_starts_at && !dates.session_ends_at && (
            <Alert severity="warning">
              Set session start and end dates under <strong>Settings</strong>, then
              build the timetable under the <strong>Timetable</strong> tab.
            </Alert>
          )}
          {canManage && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Add tier
            </Typography>
            <InlineFormRow>
              <TextField
                label="Tier name"
                value={levelName}
                onChange={(e) => setLevelName(e.target.value)}
                size="small"
                sx={{ flex: 1, minWidth: 0 }}
                fullWidth
                onKeyDown={(e) => e.key === "Enter" && void addLevel()}
              />
              <TextField
                label="Registration prefix"
                value={levelPrefix}
                onChange={(e) => setLevelPrefix(e.target.value)}
                size="small"
                placeholder="BCC"
                sx={{ width: { xs: "100%", sm: 200 }, flexShrink: 0 }}
              />
              <TextField
                select
                label="Placement group"
                value={levelPlacementGroup}
                onChange={(e) => setLevelPlacementGroup(e.target.value)}
                size="small"
                sx={{ width: { xs: "100%", sm: 220 }, flexShrink: 0 }}
              >
                {PLACEMENT_GROUPS.map((g) => (
                  <MenuItem key={g.value || "none"} value={g.value}>
                    {g.label}
                  </MenuItem>
                ))}
              </TextField>
              <FormRowButton onClick={() => void addLevel()}>
                Add tier
              </FormRowButton>
            </InlineFormRow>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              Prefix is used in student registration numbers (e.g. BCC-0001).
            </Typography>
          </Paper>
          )}

          {!session?.levels.length && (
            <Alert severity="info">
              {canManage
                ? "No tiers yet. Add a tier above, then add modules inside each tier."
                : "No tiers have been set up for this session yet."}
            </Alert>
          )}

          {session?.levels.map((level) => {
            const unassigned = level.modules.filter(
              (m) => !m.assigned_teacher,
            ).length;
            return (
              <Accordion
                key={level.id}
                expanded={expandedLevels[level.id] ?? true}
                onChange={(_, exp) =>
                  setExpandedLevels((e) => ({ ...e, [level.id]: exp }))
                }
                disableGutters
                sx={{
                  "&:before": { display: "none" },
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={600}>
                      {level.name}
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        · {level.registration_prefix}-
                      </Typography>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {level.modules.length} module
                      {level.modules.length === 1 ? "" : "s"}
                      {unassigned > 0 ? ` · ${unassigned} need a teacher` : ""}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  {canManage && (
                  <Grid container spacing={1.5} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <InlineFieldSave
                        label="Tier name"
                        value={level.name}
                        onSave={(name) =>
                          updateLevel(level.id, name, level.registration_prefix)
                        }
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <InlineFieldSave
                        label="Prefix"
                        value={level.registration_prefix}
                        onSave={(prefix) =>
                          updateLevel(level.id, level.name, prefix)
                        }
                        fullWidth
                      />
                    </Grid>
                  </Grid>
                  )}
                  {level.modules.length === 0 ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      No modules in this tier yet.
                    </Typography>
                  ) : (
                    <>
                      <Stack
                        spacing={1.5}
                        sx={{ display: { xs: "flex", md: "none" }, mb: 2 }}
                      >
                        {level.modules.map((mod) => (
                          <LevelModuleRow
                            key={mod.id}
                            layout="card"
                            mod={mod}
                            readOnly={!canManage}
                            teacherOptions={teacherOptions}
                            assigningModuleId={assigningModuleId}
                            onUpdateModule={updateModule}
                            onAssignTeacher={assignTeacher}
                            onDelete={
                              canManage
                                ? (id, name) =>
                                    setModulePendingDelete({ id, name })
                                : undefined
                            }
                            deletingModuleId={deletingModuleId}
                            testButton={
                              <TestManageButton
                                moduleId={mod.id}
                                status={mod.test?.status}
                                compact
                              />
                            }
                          />
                        ))}
                      </Stack>
                      <Box
                        sx={{
                          display: { xs: "none", md: "block" },
                          width: "100%",
                          mb: 2,
                        }}
                      >
                        <Table
                          size="small"
                          sx={{
                            width: "100%",
                            tableLayout: "fixed",
                            "& .MuiTableCell-root": { py: 1.5, px: 1.5 },
                            "& .MuiTableCell-head": {
                              fontWeight: 600,
                              color: "text.secondary",
                              verticalAlign: "bottom",
                              pb: 1,
                            },
                          }}
                        >
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ width: MODULE_TABLE_COL_WIDTH }}>
                                Module
                              </TableCell>
                              <TableCell sx={{ width: MODULE_TABLE_COL_WIDTH }}>
                                Test
                              </TableCell>
                              <TableCell sx={{ width: MODULE_TABLE_COL_WIDTH }}>
                                Teacher
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {level.modules.map((mod) => (
                              <LevelModuleRow
                                key={mod.id}
                                layout="table"
                                mod={mod}
                                readOnly={!canManage}
                                teacherOptions={teacherOptions}
                                assigningModuleId={assigningModuleId}
                                onUpdateModule={updateModule}
                                onAssignTeacher={assignTeacher}
                                onDelete={
                                  canManage
                                    ? (id, name) =>
                                        setModulePendingDelete({ id, name })
                                    : undefined
                                }
                                deletingModuleId={deletingModuleId}
                                testButton={
                                  <TestManageButton
                                    moduleId={mod.id}
                                    status={mod.test?.status}
                                    compact
                                  />
                                }
                              />
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    </>
                  )}
                  {canManage && (
                  <InlineFormRow>
                    <TextField
                      size="small"
                      label="New module name"
                      placeholder="e.g. Module 4"
                      value={moduleNames[level.id] ?? ""}
                      onChange={(e) =>
                        setModuleNames((m) => ({
                          ...m,
                          [level.id]: e.target.value,
                        }))
                      }
                      fullWidth
                      sx={{ flex: 1, minWidth: 0 }}
                      onKeyDown={(e) =>
                        e.key === "Enter" && void addModule(level.id)
                      }
                    />
                    <TextField
                      size="small"
                      label="Short code"
                      placeholder="e.g. M4"
                      value={moduleCodes[level.id] ?? ""}
                      onChange={(e) =>
                        setModuleCodes((m) => ({
                          ...m,
                          [level.id]: e.target.value,
                        }))
                      }
                      sx={{ width: { xs: "100%", sm: 160 }, flexShrink: 0 }}
                      onKeyDown={(e) =>
                        e.key === "Enter" && void addModule(level.id)
                      }
                    />
                    <FormRowButton onClick={() => void addModule(level.id)}>
                      Add module
                    </FormRowButton>
                  </InlineFormRow>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>
      )}

      {session && canManage && tab === 2 && (
        <TimetableBuilder
          sessionId={session.id}
          tiers={session.levels.map((l) => ({ id: l.id, name: l.name }))}
          canManage
        />
      )}

      {session && !canManage && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Timetable
          </Typography>
          <TimetableBuilder
            sessionId={session.id}
            tiers={session.levels.map((l) => ({ id: l.id, name: l.name }))}
            canManage={false}
          />
        </Paper>
      )}

      <Dialog
        open={modulePendingDelete !== null}
        onClose={() =>
          deletingModuleId === null && setModulePendingDelete(null)
        }
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete module</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{modulePendingDelete?.name}</strong> from this tier?
            This removes its test, teacher assignment, timetable slots, and any
            recorded scores. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setModulePendingDelete(null)}
            disabled={deletingModuleId !== null}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void confirmDeleteModule()}
            disabled={deletingModuleId !== null}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
