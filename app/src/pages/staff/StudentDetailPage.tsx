import { useEffect, useState, type ReactNode } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { apiJson, downloadPdfGet, parseApiError } from "../../api/http";
import { toastSuccess } from "../../feedback/toast";
import { StudentProgressPanel } from "../../components/StudentProgressPanel";
import { DetailRow } from "../../components/ResponsiveTableLayout";
import { PageHeader } from "../../staff/PageHeader";
import { useStaffAuth } from "../../staff/StaffAuthContext";
import { EditableDetailSection } from "./EditableDetailSection";
import { StudentModuleScoreRow } from "./StudentModuleScoreRow";
import {
  StudentSectionDialogs,
  type StudentEditSection,
} from "./StudentSectionDialogs";
import {
  formatStudentBool,
  formatStudentField,
  studentTierStatusDisplay,
  type StudentDetail,
  type TierOption,
  useStudentDetail,
} from "./studentDetailShared";

function FieldRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: ReactNode;
  emphasize?: "error";
}) {
  return (
    <DetailRow label={label}>
      {typeof value === "string" ? (
        <Typography
          variant="body2"
          color={emphasize === "error" ? "error.main" : undefined}
          sx={{ wordBreak: "break-word" }}
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
  const { student, error, setError, load, setStudent } =
    useStudentDetail(studentId);
  const [editSection, setEditSection] = useState<StudentEditSection | null>(
    null,
  );
  const [tiers, setTiers] = useState<TierOption[]>([]);
  const [completed, setCompleted] = useState(false);
  const [savingCompletion, setSavingCompletion] = useState(false);

  useEffect(() => {
    if (!student) return;
    setCompleted(student.progress.level_completed);
    apiJson<{ data: { levels: TierOption[] } }>(
      `/api/v1/admin/sessions/${student.session.id}`,
    )
      .then((response) =>
        setTiers(
          response.data.levels.map((level) => ({
            id: level.id,
            name: level.name,
          })),
        ),
      )
      .catch(() => setTiers([]));
  }, [student]);

  const download = async (kind: "id-card" | "statement" | "certificate") => {
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

  const saveCompletion = async (value: boolean) => {
    if (!studentId) return;
    setSavingCompletion(true);
    setError(null);
    try {
      await apiJson(`/api/v1/admin/registrations/${studentId}/completion`, {
        method: "PATCH",
        json: { level_completed: value },
      });
      setCompleted(value);
      toastSuccess(
        value
          ? "Marked as completed — student can download statement and certificate."
          : "Tier completion removed.",
      );
      load();
    } catch (e) {
      setError(parseApiError(e));
      setCompleted(student?.progress.level_completed ?? false);
    } finally {
      setSavingCompletion(false);
    }
  };

  const handleStudentSaved = (updated: StudentDetail) => {
    setStudent(updated);
  };

  if (!student) {
    return error ? (
      <Alert severity="error">{error}</Alert>
    ) : (
      <Typography>Loading…</Typography>
    );
  }

  const progress = student.progress;
  const tierStatus = studentTierStatusDisplay(
    progress.level_completed,
    progress.programme_phase,
  );

  return (
    <>
      <Button
        component={RouterLink}
        to="/staff/students"
        size="small"
        sx={{ mb: 2 }}
      >
        ← Students
      </Button>
      <PageHeader
        title={`${student.first_name} ${student.last_name}`}
        subtitle={`${student.registration_number} · ${student.session.name} · ${student.level.name}`}
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <EditableDetailSection
            title="Registration"
            onEdit={() => setEditSection("registration")}
          >
            <FieldRow label="Reg #" value={student.registration_number} />
            <FieldRow label="Session" value={student.session.name} />
            <FieldRow label="Tier" value={student.level.name} />
            <FieldRow
              label="Status"
              value={
                <Chip
                  size="small"
                  label={tierStatus.label}
                  color={tierStatus.color}
                />
              }
            />
            {student.level_completed_by && (
              <FieldRow
                label="Marked by"
                value={student.level_completed_by.name}
              />
            )}
          </EditableDetailSection>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <EditableDetailSection
            title="Contact"
            onEdit={() => setEditSection("contact")}
          >
            <FieldRow label="Email" value={student.email} />
            <FieldRow label="Phone" value={formatStudentField(student.phone)} />
          </EditableDetailSection>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <EditableDetailSection
            title="Guardian"
            onEdit={() => setEditSection("guardian")}
          >
            <FieldRow
              label="Name"
              value={formatStudentField(student.guardian_name)}
            />
            <FieldRow
              label="Relationship"
              value={formatStudentField(student.guardian_relationship)}
            />
            <FieldRow
              label="Phone"
              value={formatStudentField(student.guardian_phone)}
            />
            <FieldRow
              label="Email"
              value={formatStudentField(student.guardian_email)}
            />
          </EditableDetailSection>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <EditableDetailSection
            title="Personal"
            onEdit={() => setEditSection("personal")}
          >
            <FieldRow
              label="Gender"
              value={formatStudentField(student.gender)}
            />
            <FieldRow
              label="Date of birth"
              value={formatStudentField(student.date_of_birth)}
            />
            <FieldRow
              label="Nationality"
              value={formatStudentField(student.nationality)}
            />
            <FieldRow
              label="Address"
              value={formatStudentField(student.address)}
            />
          </EditableDetailSection>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <EditableDetailSection
            title="Faith & church"
            onEdit={() => setEditSection("faith")}
          >
            <FieldRow
              label="Born again"
              value={formatStudentBool(student.born_again)}
            />
            <FieldRow
              label="Date of new birth"
              value={formatStudentField(student.date_of_new_birth)}
            />
            <FieldRow
              label="New birth location"
              value={formatStudentField(student.new_birth_location)}
            />
            <FieldRow
              label="Place of worship"
              value={formatStudentField(student.place_of_worship)}
            />
            <FieldRow
              label="Church address"
              value={formatStudentField(student.place_of_worship_address)}
            />
            <FieldRow
              label="Pastor"
              value={formatStudentField(student.pastor_name)}
            />
            <FieldRow
              label="Activity group"
              value={formatStudentField(student.activity_group)}
            />
          </EditableDetailSection>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <EditableDetailSection
            title="School & medical"
            onEdit={() => setEditSection("school")}
          >
            <FieldRow
              label="Current school"
              value={formatStudentField(student.current_school)}
            />
            <FieldRow
              label="School year"
              value={formatStudentField(student.current_school_year)}
            />
            <FieldRow
              label="Allergies / medical"
              value={formatStudentField(student.allergies)}
              emphasize={student.allergies ? "error" : undefined}
            />
          </EditableDetailSection>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <EditableDetailSection
            title="Next of kin"
            onEdit={() => setEditSection("nextOfKin")}
          >
            <FieldRow
              label="Name"
              value={formatStudentField(student.next_of_kin_name)}
            />
            <FieldRow
              label="Phone"
              value={formatStudentField(student.next_of_kin_phone)}
            />
            <FieldRow
              label="Email"
              value={formatStudentField(student.next_of_kin_email)}
            />
          </EditableDetailSection>
        </Grid>
        {isAdmin && (
          <>
            <Grid size={{ xs: 12, md: 6 }}>
              <EditableDetailSection
                title="Reset Student Portal PIN"
                onEdit={() => setEditSection("portalPin")}
              >
                <Typography variant="body2" color="text.secondary">
                  Reset the student&apos;s 4-digit portal PIN if they cannot
                  sign in to take tests or view progress.
                </Typography>
              </EditableDetailSection>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: { xs: 2, sm: 3 }, height: "100%" }}>
                <Typography variant="h6" gutterBottom>
                  Tier completion
                </Typography>
                <FormControlLabel
                  sx={{ alignItems: "flex-start", mr: 0 }}
                  control={
                    <Switch
                      checked={completed}
                      disabled={savingCompletion}
                      onChange={(e) => void saveCompletion(e.target.checked)}
                    />
                  }
                  label={
                    <Typography
                      variant="body2"
                      sx={{ pt: 0.75, wordBreak: "break-word" }}
                    >
                      {completed
                        ? "Successfully completed this tier"
                        : "Not marked complete"}
                    </Typography>
                  }
                />
                {student.level_completed_by && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 1 }}
                  >
                    Last set by {student.level_completed_by.name}
                  </Typography>
                )}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: { xs: 2, sm: 3 }, height: "100%" }}>
                <Typography variant="h6" gutterBottom>
                  Documents
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Download student documents. Statement and certificate require
                  tier completion.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => void download("id-card")}
                  >
                    ID card
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!completed}
                    onClick={() => void download("statement")}
                  >
                    Statement
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={!completed}
                    onClick={() => void download("certificate")}
                  >
                    Certificate
                  </Button>
                </Stack>
              </Paper>
            </Grid>
          </>
        )}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ overflowX: "auto" }}>
            <StudentProgressPanel
              variant="staff"
              progress={progress}
              programmePhase={progress.programme_phase}
              showAdminColumn={isAdmin}
              moduleRows={progress.modules.map((module) => (
                <StudentModuleScoreRow
                  key={module.module_id}
                  studentId={studentId ?? ""}
                  module={module}
                  isAdmin={isAdmin}
                  onSaved={load}
                  onError={setError}
                />
              ))}
              adminColumnFooter={
                isAdmin ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", px: 1, mt: 1 }}
                  >
                    Edit a score to correct a mistake made when it was recorded.
                    Changes are logged in the audit trail.
                  </Typography>
                ) : null
              }
            />
          </Box>
        </Grid>
      </Grid>

      <StudentSectionDialogs
        section={editSection}
        student={student}
        studentId={studentId ?? ""}
        tiers={tiers}
        onClose={() => setEditSection(null)}
        onSaved={handleStudentSaved}
        onError={setError}
      />
    </>
  );
}
