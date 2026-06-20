import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { schoolTheme } from './theme/schoolTheme';
import { HomePage } from './pages/HomePage';
import { RegisterPage } from './pages/RegisterPage';
import { StudentPortalPage } from './pages/StudentPortalPage';
import { StudentTestPage } from './pages/StudentTestPage';
import { StaffAuthProvider } from './staff/StaffAuthContext';
import { StaffLayout } from './staff/StaffLayout';
import { RequireAdmin } from './staff/RequireAdmin';
import { RequireRole } from './staff/RequireRole';
import { StaffLoginPage } from './pages/staff/StaffLoginPage';
import { DashboardPage } from './pages/staff/DashboardPage';
import { SessionsPage } from './pages/staff/SessionsPage';
import { SessionDetailPage } from './pages/staff/SessionDetailPage';
import { UsersPage } from './pages/staff/UsersPage';
import { ModulesPage } from './pages/staff/ModulesPage';
import { ModuleTestPage } from './pages/staff/ModuleTestPage';
import { ScoresPage } from './pages/staff/ScoresPage';
import { StudentsPage } from './pages/staff/StudentsPage';
import { StudentDetailPage } from './pages/staff/StudentDetailPage';
import { StudentEditPage } from './pages/staff/StudentEditPage';
import { AttendancePage } from './pages/staff/AttendancePage';
import { RegistrationsPage } from './pages/staff/RegistrationsPage';
import { AuditLogsPage } from './pages/staff/AuditLogsPage';
import { SendEmailPage } from './pages/staff/SendEmailPage';

function LegacyAdminSessionRedirect() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return <Navigate to={`/staff/sessions/${sessionId}`} replace />;
}

export default function App() {
  return (
    <ThemeProvider theme={schoolTheme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={4} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <StaffAuthProvider>
          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/student" element={<StudentPortalPage />} />
          <Route path="/student/tests/:testId" element={<StudentTestPage />} />

          <Route path="/staff/login" element={<StaffLoginPage />} />
          <Route path="/admin/login" element={<Navigate to="/staff/login" replace />} />

          <Route path="/staff" element={<StaffLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="modules" element={<ModulesPage />} />
            <Route path="modules/:moduleId/test" element={<ModuleTestPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="scores" element={<ScoresPage />} />
            <Route element={<RequireRole roles={['admin', 'assistant']} />}>
              <Route path="students" element={<StudentsPage />} />
              <Route path="students/:studentId/edit" element={<StudentEditPage />} />
              <Route path="students/:studentId" element={<StudentDetailPage />} />
              <Route path="sessions" element={<SessionsPage />} />
              <Route path="sessions/:sessionId" element={<SessionDetailPage />} />
              <Route path="registrations" element={<RegistrationsPage />} />
            </Route>
            <Route element={<RequireAdmin />}>
              <Route path="send-email" element={<SendEmailPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
            </Route>
          </Route>

          <Route path="/admin" element={<Navigate to="/staff" replace />} />
          <Route
            path="/admin/sessions/:sessionId"
            element={<LegacyAdminSessionRedirect />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </StaffAuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}
