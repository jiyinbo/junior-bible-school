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
    level_completed_count: number;
    level_not_completed_count: number;
    open_tests: number;
    my_modules: number;
    assigned_students?: number;
  };
  registrations_by_level: { level_id: number; level_name: string; count: number }[];
  modules_by_level: { level_id: number; level_name: string; module_count: number }[];
  attendance_last_7_days: { date: string; count: number }[];
};

const CHART_COLORS = ['#1a3352', '#2a4a73', '#b8923a', '#4a7c59', '#6b4c9a', '#c45c3e'];

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

function firstName(fullName: string | undefined): string {
  if (!fullName?.trim()) return 'there';
  return fullName.trim().split(/\s+/)[0] ?? fullName;
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
        ].filter((x) => x.value > 0)
      : [];

  const regChart = stats?.registrations_by_level ?? [];
  const modChart = stats?.modules_by_level ?? [];
  const attendanceChart =
    stats?.attendance_last_7_days.map((d) => ({
      ...d,
      label: formatShortDate(d.date),
    })) ?? [];

  const metricCount = isAdmin ? 8 : 6;

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
              ? 'Session overview — levels, modules, students, then today’s attendance and tests.'
              : 'Your levels and modules, student progress, and today’s teaching activity.'}
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
                <MetricCard label="Levels" value={m?.levels_count ?? 0} hint="In this session" />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                <MetricCard
                  label="Modules"
                  value={m?.modules_count ?? 0}
                  hint={isAdmin ? 'Across all levels' : 'In your levels'}
                />
              </Grid>
              {!isAdmin && (
                <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                  <MetricCard label="My modules" value={m?.my_modules ?? 0} hint="Assigned to you" />
                </Grid>
              )}
              <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                <MetricCard
                  label={isAdmin ? 'Registered students' : 'Students (your levels)'}
                  value={m?.registrations_total ?? 0}
                  hint={stats?.session?.registration_is_open ? 'Registration open' : 'Registration closed'}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                <MetricCard
                  label="Levels completed"
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
                <>
                  <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                    <MetricCard label="Admins" value={m?.staff_admins ?? 0} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                    <MetricCard label="Teachers" value={m?.staff_teachers ?? 0} />
                  </Grid>
                </>
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
                  Modules per level
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
                  Students per level
                </Typography>
                <Box sx={{ width: '100%', height: 240 }}>
                  {regChart.length > 0 ? (
                    <ResponsiveContainer>
                      <BarChart data={regChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="level_name" width={90} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Students" fill="#b8923a" radius={[0, 6, 6, 0]} />
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
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Attendance — last 7 days
                </Typography>
                <Box sx={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={attendanceChart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Present" fill="#1a3352" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          {isAdmin && staffPie.length > 0 && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Staff by role
                  </Typography>
                  <Box sx={{ width: '100%', height: 240 }}>
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
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
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
