import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiJson } from '../../api/http';
import { MetricCard } from '../../staff/MetricCard';
import { useStaffAuth } from '../../staff/StaffAuthContext';
import { dashboardQuickLinksForRole } from '../../staff/navConfig';

type SessionOption = { id: number; name: string };

type DashboardStats = {
  session: {
    id: number;
    name: string;
    slug: string;
    is_past: boolean;
    registration_is_open: boolean;
  } | null;
  metrics: {
    attendance_today: number;
    registrations_total: number;
    levels_count: number;
    modules_count: number;
    staff_admins: number;
    staff_teachers: number;
    staff_assistants: number;
    level_completed_count: number;
    level_not_completed_count: number;
    open_tests: number;
    my_modules: number;
    assigned_students?: number;
  };
  registrations_by_level: { level_id: number; level_name: string; count: number }[];
  modules_by_level: { level_id: number; level_name: string; module_count: number }[];
  attendance_last_7_days_by_level: {
    levels: { level_id: number; level_name: string }[];
    days: { date: string; counts: number[] }[];
  };
  gender_by_level: GenderLevelRow[];
  gender_completed_by_level: GenderLevelRow[];
  completed_by_gender: GenderTotals;
  nationalities: { nationality: string; count: number }[];
  churches: { church: string; count: number }[];
  grades_by_level: GradesByLevelRow[];
};

type GradesByLevelRow = {
  level_id: number;
  level_name: string;
  distinction: number;
  merit: number;
  upper_credit: number;
  lower_credit: number;
  pass: number;
  ungraded: number;
  total_graded: number;
};

type GenderLevelRow = {
  level_id: number;
  level_name: string;
  boys: number;
  girls: number;
  other: number;
  total: number;
};

type GenderTotals = {
  boys: number;
  girls: number;
  other: number;
  total: number;
};

const CHART_COLORS = ['#1a3352', '#2a4a73', '#b8923a', '#4a7c59', '#6b4c9a', '#c45c3e'];
const BOYS_COLOR = '#2a4a73';
const GIRLS_COLOR = '#b8923a';
const OTHER_GENDER_COLOR = '#6b7280';

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

function firstName(fullName: string | undefined): string {
  if (!fullName?.trim()) return 'there';
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function staffRoleLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function staffAccountsHint(admins: number, teachers: number, assistants: number): string {
  return [
    staffRoleLabel(admins, 'admin', 'admins'),
    staffRoleLabel(teachers, 'teacher', 'teachers'),
    staffRoleLabel(assistants, 'assistant', 'assistants'),
  ].join(' · ');
}

function verticalBarChartHeight(itemCount: number, rowHeight = 40): number {
  if (itemCount === 0) return 280;
  return Math.min(720, Math.max(280, itemCount * rowHeight + 56));
}

function categoryAxisWidth(labels: string[], min = 120, max = 280): number {
  const longest = labels.reduce((longestLabel, label) => Math.max(longestLabel, label.length), 0);
  return Math.min(max, Math.max(min, Math.ceil(longest * 6.5)));
}

type SplitTooltipProps = {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
};

function SplitCountTooltip({ active, payload, label }: SplitTooltipProps) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 1.25,
        boxShadow: 1,
      }}
    >
      {label && (
        <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.75 }}>
          {label}
        </Typography>
      )}
      {payload.map((entry) => (
        <Typography key={String(entry.name)} variant="caption" display="block" sx={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </Typography>
      ))}
      <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 0.75 }}>
        Total: {total}
      </Typography>
    </Box>
  );
}

function horizontalStackTotalLabel(props: unknown) {
  const { x, y, width, height, payload } = props as {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    payload?: GenderLevelRow;
  };
  const total = payload?.total ?? 0;
  if (x == null || y == null || width == null || height == null || total === 0) {
    return null;
  }

  return (
    <text
      x={x + width + 6}
      y={y + height / 2}
      fill="#374151"
      fontSize={11}
      fontWeight={600}
      dominantBaseline="middle"
    >
      {total}
    </text>
  );
}

function verticalStackTotalLabel(props: unknown) {
  const { x, y, width, payload } = props as {
    x?: number;
    y?: number;
    width?: number;
    payload?: Record<string, string | number>;
  };
  const total = Number(payload?.total ?? 0);
  if (x == null || y == null || width == null || total === 0) {
    return null;
  }

  return (
    <text x={x + width / 2} y={y - 6} fill="#374151" fontSize={11} fontWeight={600} textAnchor="middle">
      {total}
    </text>
  );
}

export function DashboardPage() {
  const { user, isAdmin } = useStaffAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [sessionId, setSessionId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(() => {
    setLoading(true);
    setError(null);
    const q = sessionId !== '' ? `?jbs_session_id=${sessionId}` : '';
    apiJson<{ data: DashboardStats }>(`/api/v1/staff/dashboard/stats${q}`)
      .then((r) => {
        setStats(r.data);
        if (sessionId === '' && r.data.session) {
          setSessionId(r.data.session.id);
        }
      })
      .catch(() => setError('Could not load dashboard statistics.'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    if (isAdmin) {
      apiJson<{ data: SessionOption[] }>('/api/v1/admin/sessions')
        .then((r) => setSessions(r.data.map((s) => ({ id: s.id, name: s.name }))))
        .catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const m = stats?.metrics;
  const quickLinks = dashboardQuickLinksForRole(user!.role);

  const staffPie =
    isAdmin && m
      ? [
          { name: 'Admins', value: m.staff_admins },
          { name: 'Teachers', value: m.staff_teachers },
          { name: 'Assistants', value: m.staff_assistants },
        ]
      : [];
  const staffTotal =
    (m?.staff_admins ?? 0) + (m?.staff_teachers ?? 0) + (m?.staff_assistants ?? 0);

  const modChart = stats?.modules_by_level ?? [];
  const genderByLevel = stats?.gender_by_level ?? [];
  const showGenderOther = genderByLevel.some((row) => row.other > 0);
  const genderCompletedByLevel = stats?.gender_completed_by_level ?? [];
  const completedByGender = stats?.completed_by_gender;
  const nationalityChart = stats?.nationalities ?? [];
  const churchChart = stats?.churches ?? [];
  const churchChartHeight = verticalBarChartHeight(churchChart.length);
  const churchAxisWidth = categoryAxisWidth(churchChart.map((row) => row.church));
  const gradesByLevel = stats?.grades_by_level ?? [];
  const attendanceLevels = stats?.attendance_last_7_days_by_level?.levels ?? [];
  const attendanceChart =
    stats?.attendance_last_7_days_by_level?.days.map((d) => {
      const row: Record<string, string | number> = {
        date: d.date,
        label: formatShortDate(d.date),
      };
      attendanceLevels.forEach((level, i) => {
        row[level.level_name] = d.counts[i] ?? 0;
      });
      row.total = d.counts.reduce((sum, count) => sum + count, 0);
      return row;
    }) ?? [];

  const metricCount = isAdmin ? 7 : 6;

  return (
    <>
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          Welcome, {firstName(user?.name)}
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1.5, sm: 2 }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          gap={2}
        >
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
            {isAdmin
              ? 'Session overview — tiers, modules, students, then today’s attendance and tests.'
              : 'Your tiers and modules, student progress, and today’s teaching activity.'}
          </Typography>
          {isAdmin && sessions.length > 0 && (
            <TextField
              select
              label="Session"
              size="small"
              value={sessionId}
              onChange={(e) => setSessionId(Number(e.target.value))}
              sx={{ width: { xs: '100%', sm: 280 }, flexShrink: 0 }}
            >
              {sessions.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
        {stats?.session && (
          <Typography variant="caption" color="text.secondary">
            Metrics for {stats.session.name}
            {stats.session.is_past ? ' (past session)' : ''}
            {stats.session.registration_is_open ? ' · registration open' : ''}
          </Typography>
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!stats?.session && !loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No session configured yet.{' '}
          {isAdmin && (
            <>
              <Link to="/staff/sessions">Create a session</Link> to see metrics here.
            </>
          )}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {loading
          ? Array.from({ length: metricCount }).map((_, i) => (
              <Grid key={i} size={{ xs: 6, sm: 4, md: 3 }}>
                <Skeleton variant="rounded" height={108} />
              </Grid>
            ))
          : (
            <>
              <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                <MetricCard label="Tiers" value={m?.levels_count ?? 0} hint="In this session" />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                <MetricCard
                  label="Modules"
                  value={m?.modules_count ?? 0}
                  hint={isAdmin ? 'Across all tiers' : 'In your tiers'}
                />
              </Grid>
              {!isAdmin && (
                <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                  <MetricCard label="My modules" value={m?.my_modules ?? 0} hint="Assigned to you" />
                </Grid>
              )}
              <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                <MetricCard
                  label={isAdmin ? 'Registered students' : 'Students (your tiers)'}
                  value={m?.registrations_total ?? 0}
                  hint={stats?.session?.registration_is_open ? 'Registration open' : 'Registration closed'}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                <MetricCard
                  label="Tiers completed"
                  value={m?.level_completed_count ?? 0}
                  color="success"
                  hint={`${m?.level_not_completed_count ?? 0} still in progress`}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                <MetricCard
                  label="Attendance today"
                  value={m?.attendance_today ?? 0}
                  hint="Distinct scans logged today"
                  color="success"
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                <MetricCard label="Open tests" value={m?.open_tests ?? 0} hint="Across modules" />
              </Grid>
              {isAdmin && (
                <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                  <MetricCard
                    label="Staff accounts"
                    value={
                      (m?.staff_admins ?? 0) + (m?.staff_teachers ?? 0) + (m?.staff_assistants ?? 0)
                    }
                    hint={staffAccountsHint(
                      m?.staff_admins ?? 0,
                      m?.staff_teachers ?? 0,
                      m?.staff_assistants ?? 0,
                    )}
                  />
                </Grid>
              )}
            </>
          )}
      </Grid>

      {!loading && stats?.session && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Modules per tier
                </Typography>
                <Box sx={{ width: '100%', height: 240 }}>
                  {modChart.length > 0 ? (
                    <ResponsiveContainer>
                      <BarChart data={modChart}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="level_name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="module_count" name="Modules" fill="#2a4a73" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No modules yet.
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Students per tier
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Total registrations, stacked by boys and girls
                  {showGenderOther ? ' (and other / unspecified)' : ''}
                </Typography>
                <Box sx={{ width: '100%', height: 260 }}>
                  {genderByLevel.some((row) => row.total > 0) ? (
                    <ResponsiveContainer>
                      <BarChart data={genderByLevel} layout="vertical" margin={{ left: 8, right: 36, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="level_name" width={90} tick={{ fontSize: 11 }} />
                        <Tooltip content={<SplitCountTooltip />} />
                        <Legend />
                        <Bar dataKey="boys" name="Boys" stackId="students" fill={BOYS_COLOR} />
                        <Bar
                          dataKey="girls"
                          name="Girls"
                          stackId="students"
                          fill={GIRLS_COLOR}
                          radius={showGenderOther ? undefined : [0, 6, 6, 0]}
                        >
                          {!showGenderOther && <LabelList content={horizontalStackTotalLabel} />}
                        </Bar>
                        {showGenderOther && (
                          <Bar
                            dataKey="other"
                            name="Other / unspecified"
                            stackId="students"
                            fill={OTHER_GENDER_COLOR}
                            radius={[0, 6, 6, 0]}
                          >
                            <LabelList content={horizontalStackTotalLabel} />
                          </Bar>
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No registrations yet.
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Tier completed (boys &amp; girls)
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Students marked tier complete
                  {completedByGender
                    ? ` — ${completedByGender.boys} boys, ${completedByGender.girls} girls`
                    : ''}
                  {completedByGender && completedByGender.other > 0
                    ? `, ${completedByGender.other} other`
                    : ''}
                </Typography>
                <Box sx={{ width: '100%', height: 240 }}>
                  {genderCompletedByLevel.some((row) => row.total > 0) ? (
                    <ResponsiveContainer>
                      <BarChart data={genderCompletedByLevel} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="level_name" width={90} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="boys" name="Boys" stackId="completed" fill={BOYS_COLOR} />
                        <Bar dataKey="girls" name="Girls" stackId="completed" fill={GIRLS_COLOR} radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No tier completions recorded yet.
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Nationality
                </Typography>
                <Box sx={{ width: '100%', height: 260 }}>
                  {nationalityChart.length > 0 ? (
                    <ResponsiveContainer>
                      <BarChart data={nationalityChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="nationality" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Students" fill="#4a7c59" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No nationality data yet.
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Churches represented
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Place of worship from student registrations
                </Typography>
                <Box sx={{ width: '100%', height: churchChartHeight }}>
                  {churchChart.length > 0 ? (
                    <ResponsiveContainer>
                      <BarChart
                        data={churchChart}
                        layout="vertical"
                        margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
                        barCategoryGap="24%"
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="church"
                          width={churchAxisWidth}
                          tick={{ fontSize: 11 }}
                          interval={0}
                        />
                        <Tooltip />
                        <Bar dataKey="count" name="Students" fill="#6b4c9a" radius={[0, 6, 6, 0]} barSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No church data yet.
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: isAdmin ? 6 : 12 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Grades per tier
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Overall grade from module test averages (Distinction, Merit, Upper Credit, Lower Credit, Pass)
                </Typography>
                <Box sx={{ width: '100%', height: 280 }}>
                  {gradesByLevel.some((row) => row.total_graded > 0) ? (
                    <ResponsiveContainer>
                      <BarChart data={gradesByLevel} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="level_name" width={90} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="distinction" name="Distinction (D)" stackId="grades" fill={CHART_COLORS[0]} />
                        <Bar dataKey="merit" name="Merit (M)" stackId="grades" fill={CHART_COLORS[1]} />
                        <Bar dataKey="upper_credit" name="Upper Credit (UC)" stackId="grades" fill={CHART_COLORS[2]} />
                        <Bar dataKey="lower_credit" name="Lower Credit (LC)" stackId="grades" fill={CHART_COLORS[3]} />
                        <Bar
                          dataKey="pass"
                          name="Pass (P)"
                          stackId="grades"
                          fill={CHART_COLORS[4]}
                          radius={[0, 6, 6, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No graded students yet — overall grades appear once module scores are recorded.
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          {isAdmin && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Staff by role
                  </Typography>
                  <Box sx={{ width: '100%', height: 280 }}>
                    {staffTotal > 0 ? (
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={staffPie}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                          >
                            {staffPie.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No staff accounts yet.
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
          <Grid size={{ xs: 12 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Attendance — last 7 days
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Present students per day, stacked by tier
                </Typography>
                <Box sx={{ width: '100%', height: 280 }}>
                  {attendanceLevels.length > 0 ? (
                    <ResponsiveContainer>
                      <BarChart data={attendanceChart} margin={{ top: 20, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip content={<SplitCountTooltip />} />
                        <Legend />
                        {attendanceLevels.map((level, i) => (
                          <Bar
                            key={level.level_id}
                            dataKey={level.level_name}
                            stackId="attendance"
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                            radius={
                              i === attendanceLevels.length - 1 ? [6, 6, 0, 0] : undefined
                            }
                          >
                            {i === attendanceLevels.length - 1 && (
                              <LabelList content={verticalStackTotalLabel} />
                            )}
                          </Bar>
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No tiers in this session yet.
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Typography variant="subtitle2" sx={{ mb: 1.5, mt: 1 }}>
        Quick links
      </Typography>
      <Grid container spacing={2}>
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Grid key={item.path} size={{ xs: 12, sm: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardActionArea component={RouterLink} to={item.path} sx={{ height: '100%' }}>
                  <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', minHeight: 56 }}>
                    <Icon color="primary" />
                    <Typography fontWeight={600}>{item.label}</Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </>
  );
}
