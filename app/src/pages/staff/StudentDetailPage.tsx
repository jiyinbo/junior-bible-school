import type { ReactNode } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { downloadPdfGet, parseApiError } from '../../api/http';
import { StudentProgressPanel } from '../../components/StudentProgressPanel';
import { DetailRow } from '../../components/ResponsiveTableLayout';
import { PageHeader } from '../../staff/PageHeader';
import { useStaffAuth } from '../../staff/StaffAuthContext';
import {
  formatStudentBool,
  formatStudentField,
  studentTierStatusDisplay,
  useStudentDetail,
} from './studentDetailShared';

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Stack spacing={0.5}>{children}</Stack>
    </Paper>
  );
}

function FieldRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: ReactNode;
  emphasize?: 'error';
}) {
  return (
    <DetailRow label={label}>
      {typeof value === 'string' ? (
        <Typography
          variant="body2"
          color={emphasize === 'error' ? 'error.main' : undefined}
          sx={{ wordBreak: 'break-word' }}
        >
          {value}
        </Typography>
      ) : (
        value
      )}
    </DetailRow>
  );
}

export function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { isAdmin } = useStaffAuth();
  const { student, error, setError } = useStudentDetail(studentId);

  const download = async (kind: 'id-card' | 'statement' | 'certificate') => {
    if (!studentId || !student) return;
    setError(null);
    try {
      await downloadPdfGet(
        `/api/v1/admin/registrations/${studentId}/documents/${kind}`,
        `jbs-${kind}-${student.registration_number}.pdf`,
      );
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  if (!student) {
    return error ? <Alert severity="error">{error}</Alert> : <Typography>Loading…</Typography>;
  }

  const p = student.progress;
  const completed = p.level_completed;
  const tierStatus = studentTierStatusDisplay(completed, p.programme_phase);

  return (
    <>
      <Button component={RouterLink} to="/staff/students" size="small" sx={{ mb: 2 }}>
        ← Students
      </Button>
      <PageHeader
        title={`${student.first_name} ${student.last_name}`}
        subtitle={`${student.registration_number} · ${student.session.name} · ${student.level.name}`}
        action={
          <Button
            component={RouterLink}
            to={`/staff/students/${studentId}/edit`}
            variant="outlined"
            startIcon={<EditOutlinedIcon />}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Edit student
          </Button>
        }
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <DetailSection title="Registration">
            <FieldRow label="Reg #" value={student.registration_number} />
            <FieldRow label="Session" value={student.session.name} />
            <FieldRow label="Tier" value={student.level.name} />
            <FieldRow
              label="Status"
              value={
                <Chip size="small" label={tierStatus.label} color={tierStatus.color} />
              }
            />
            {student.level_completed_by && (
              <FieldRow label="Marked by" value={student.level_completed_by.name} />
            )}
          </DetailSection>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <DetailSection title="Contact">
            <FieldRow label="Email" value={student.email} />
            <FieldRow label="Phone" value={formatStudentField(student.phone)} />
          </DetailSection>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <DetailSection title="Guardian">
            <FieldRow label="Name" value={formatStudentField(student.guardian_name)} />
            <FieldRow label="Relationship" value={formatStudentField(student.guardian_relationship)} />
            <FieldRow label="Phone" value={formatStudentField(student.guardian_phone)} />
            <FieldRow label="Email" value={formatStudentField(student.guardian_email)} />
          </DetailSection>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <DetailSection title="Personal">
            <FieldRow label="Gender" value={formatStudentField(student.gender)} />
            <FieldRow label="Date of birth" value={formatStudentField(student.date_of_birth)} />
            <FieldRow label="Nationality" value={formatStudentField(student.nationality)} />
            <FieldRow label="Address" value={formatStudentField(student.address)} />
          </DetailSection>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <DetailSection title="Faith & church">
            <FieldRow label="Born again" value={formatStudentBool(student.born_again)} />
            <FieldRow label="Date of new birth" value={formatStudentField(student.date_of_new_birth)} />
            <FieldRow label="New birth location" value={formatStudentField(student.new_birth_location)} />
            <FieldRow label="Place of worship" value={formatStudentField(student.place_of_worship)} />
            <FieldRow label="Church address" value={formatStudentField(student.place_of_worship_address)} />
            <FieldRow label="Pastor" value={formatStudentField(student.pastor_name)} />
            <FieldRow label="Activity group" value={formatStudentField(student.activity_group)} />
          </DetailSection>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <DetailSection title="School & medical">
            <FieldRow label="Current school" value={formatStudentField(student.current_school)} />
            <FieldRow label="School year" value={formatStudentField(student.current_school_year)} />
            <FieldRow
              label="Allergies / medical"
              value={formatStudentField(student.allergies)}
              emphasize={student.allergies ? 'error' : undefined}
            />
          </DetailSection>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <DetailSection title="Next of kin">
            <FieldRow label="Name" value={formatStudentField(student.next_of_kin_name)} />
            <FieldRow label="Phone" value={formatStudentField(student.next_of_kin_phone)} />
            <FieldRow label="Email" value={formatStudentField(student.next_of_kin_email)} />
          </DetailSection>
        </Grid>
        {isAdmin && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Documents
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Download student documents. Statement and certificate require tier completion.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button size="small" variant="outlined" onClick={() => void download('id-card')}>
                  ID card
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={!completed}
                  onClick={() => void download('statement')}
                >
                  Statement
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  disabled={!completed}
                  onClick={() => void download('certificate')}
                >
                  Certificate
                </Button>
              </Stack>
            </Paper>
          </Grid>
        )}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <StudentProgressPanel
              variant="staff"
              progress={p}
              programmePhase={p.programme_phase}
            />
          </Box>
        </Grid>
      </Grid>
    </>
  );
}
