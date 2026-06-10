import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
} from '@mui/material';
import { apiJson } from '../../api/http';
import { PageHeader } from '../../staff/PageHeader';
import { StepChildInfo } from '../registration/StepChildInfo';
import { StepIdCard } from '../registration/StepIdCard';
import type { ChildForm, EnrolledParticipant, GuardianInfo, LevelOption } from '../registration/types';
import { AdminStepProgramme } from './admin-registration/AdminStepProgramme';
import { AdminStepSummary } from './admin-registration/AdminStepSummary';

const STEPS = ['Parent / guardian', 'Student information', 'Summary', 'Confirmation'];

type Session = { id: number; name: string };

const initialGuardian = (): Pick<
  GuardianInfo,
  'guardian_name' | 'guardian_relationship' | 'guardian_phone' | 'guardian_email'
> => ({
  guardian_name: '',
  guardian_relationship: '',
  guardian_phone: '',
  guardian_email: '',
});

export function RegistrationsPage() {
  const [step, setStep] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState<number | ''>('');
  const [levels, setLevels] = useState<LevelOption[]>([]);
  const [levelsLoading, setLevelsLoading] = useState(false);
  const [guardian, setGuardian] = useState(initialGuardian);
  const [children, setChildren] = useState<ChildForm[]>([]);
  const [enrolled, setEnrolled] = useState<EnrolledParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiJson<{ data: Session[] }>('/api/v1/admin/sessions')
      .then((r) => {
        setSessions(r.data);
        if (r.data.length > 0) {
          setSessionId((prev) => (prev === '' ? r.data[0].id : prev));
        }
      })
      .catch(() => setError('Could not load sessions.'));
  }, []);

  const sessionName = useMemo(
    () => sessions.find((s) => s.id === sessionId)?.name ?? '',
    [sessions, sessionId],
  );

  const loadLevels = async (id: number): Promise<{ levels: LevelOption[]; error: string | null }> => {
    setLevelsLoading(true);
    try {
      const r = await apiJson<{ data: { levels: LevelOption[] } }>(`/api/v1/admin/sessions/${id}`);
      const loaded = r.data.levels;
      setLevels(loaded);
      if (loaded.length === 0) {
        return { levels: [], error: 'No tiers available for this session.' };
      }
      return { levels: loaded, error: null };
    } catch {
      setLevels([]);
      return { levels: [], error: 'Could not load tiers for this session.' };
    } finally {
      setLevelsLoading(false);
    }
  };

  const goToStudentStep = async () => {
    if (sessionId === '') return;
    setError(null);
    const { error: loadErr } = await loadLevels(sessionId);
    if (loadErr) {
      setError(loadErr);
      return;
    }
    setStep(1);
  };

  const handleSessionChange = (id: number | '') => {
    setSessionId(id);
    setLevels([]);
    setChildren([]);
    setEnrolled([]);
  };

  const resetWizard = () => {
    setStep(0);
    setSessionId('');
    setLevels([]);
    setGuardian(initialGuardian());
    setChildren([]);
    setEnrolled([]);
    setError(null);
  };

  return (
    <>
      <PageHeader
        title="Register student"
        subtitle="Admin override: register a student when public registration is closed. Same fields and steps as the public registration form."
      />

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3, maxWidth: 900 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <LinearProgress
        variant="determinate"
        value={((step + 1) / STEPS.length) * 100}
        sx={{ mb: 3, maxWidth: 900, borderRadius: 1 }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2, maxWidth: 900 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900 }}>
        {step === 0 && (
          <AdminStepProgramme
            sessionId={sessionId}
            sessions={sessions}
            guardian={guardian}
            onSessionChange={handleSessionChange}
            onGuardianChange={(patch) => setGuardian((g) => ({ ...g, ...patch }))}
            onNext={() => void goToStudentStep()}
            nextLoading={levelsLoading}
          />
        )}
        {step === 1 && (
          <StepChildInfo
            levels={levels}
            addedChildren={children}
            onAddedChildrenChange={setChildren}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && sessionId !== '' && (
          <AdminStepSummary
            sessionName={sessionName}
            sessionId={sessionId}
            guardian={guardian}
            children={children}
            levels={levels}
            onBack={() => setStep(1)}
            onSuccess={(data) => {
              setEnrolled(data);
              setStep(3);
            }}
            onError={setError}
          />
        )}
        {step === 3 && enrolled.length > 0 && (
          <StepIdCard
            enrolled={enrolled}
            footer={
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button variant="contained" onClick={resetWizard}>
                  Register another student
                </Button>
                <Button component={RouterLink} to="/staff/students" variant="outlined">
                  View all students
                </Button>
              </Stack>
            }
          />
        )}
      </Paper>
    </>
  );
}
