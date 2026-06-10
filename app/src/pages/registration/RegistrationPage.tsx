import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  LinearProgress,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import { apiJson } from '../../api/http';
import { usePublicRegistrationOpen } from '../../hooks/usePublicRegistrationOpen';
import { StepParentInfo } from './StepParentInfo';
import { StepChildInfo } from './StepChildInfo';
import { StepSummary } from './StepSummary';
import { StepIdCard } from './StepIdCard';
import type { ChildForm, EnrolledParticipant, GuardianInfo, LevelOption, SessionOption } from './types';

const STEPS = ['Parent / guardian', 'Child information', 'Summary', 'ID card'];

const initialGuardian: GuardianInfo = {
  session_slug: '',
  guardian_name: '',
  guardian_relationship: '',
  guardian_phone: '',
  guardian_email: '',
};

export function RegistrationPage() {
  const { loading: regStatusLoading, registrationOpen } = usePublicRegistrationOpen();
  const [step, setStep] = useState(0);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [levels, setLevels] = useState<LevelOption[]>([]);
  const [levelsLoading, setLevelsLoading] = useState(false);
  const [guardian, setGuardian] = useState<GuardianInfo>(initialGuardian);
  const [children, setChildren] = useState<ChildForm[]>([]);
  const [enrolled, setEnrolled] = useState<EnrolledParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    apiJson<{ data: SessionOption[] }>('/api/v1/public/sessions')
      .then((r) => {
        setSessions(r.data);
        const firstSelectable = r.data.find((s) => s.registration_is_open !== false);
        if (firstSelectable) {
          setGuardian((prev) =>
            prev.session_slug ? prev : { ...prev, session_slug: firstSelectable.slug },
          );
        }
      })
      .catch(() => setLoadError('Could not load sessions.'));
  }, []);

  const sessionName = useMemo(
    () => sessions.find((s) => s.slug === guardian.session_slug)?.name ?? '',
    [sessions, guardian.session_slug],
  );

  const loadLevels = async (
    slug: string,
  ): Promise<{ levels: LevelOption[]; error: string | null }> => {
    setLevelsLoading(true);
    try {
      const r = await apiJson<{ data: { levels: LevelOption[]; registration_is_open: boolean } }>(
        `/api/v1/public/sessions/${encodeURIComponent(slug)}`,
      );
      if (!r.data.registration_is_open) {
        const message = 'Registration is not open for this session.';
        setLevels([]);
        return { levels: [], error: message };
      }
      setLevels(r.data.levels);
      return { levels: r.data.levels, error: null };
    } catch {
      const message = 'Could not load tiers for this session.';
      setLevels([]);
      return { levels: [], error: message };
    } finally {
      setLevelsLoading(false);
    }
  };

  const goToChildStep = async () => {
    setError(null);
    const { levels: loaded, error: loadErr } = await loadLevels(guardian.session_slug);
    if (loadErr || loaded.length === 0) {
      setError(loadErr ?? 'No tiers available for this session.');
      return;
    }
    setStep(1);
  };

  const updateGuardian = (patch: Partial<GuardianInfo>) => {
    setGuardian((prev) => {
      const next = { ...prev, ...patch };
      if (patch.session_slug !== undefined && patch.session_slug !== prev.session_slug) {
        setChildren([]);
        setLevels([]);
      }
      return next;
    });
  };

  return (
      <Container maxWidth="md" sx={{ py: 6, px: { xs: 2, sm: 3 } }}>
        <Button component={RouterLink} to="/" sx={{ mb: 2 }}>
          ← Home
        </Button>
        <Typography variant="h4" gutterBottom>
          Junior Bible School registration
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Register one or more children for an open session. You will receive a registration number and QR code for each child.
        </Typography>

        {(regStatusLoading || registrationOpen) && (
          <>
            <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
              {STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <LinearProgress
              variant="determinate"
              value={((step + 1) / STEPS.length) * 100}
              sx={{ mb: 3, borderRadius: 1 }}
            />
          </>
        )}

        {loadError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {loadError}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!regStatusLoading && !registrationOpen && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Registration is not open at the moment. Please check back when a new session opens. Staff can
            still register students from the admin area.
            <Box sx={{ mt: 2 }}>
              <Button component={RouterLink} to="/" variant="outlined" size="small">
                Back to home
              </Button>
            </Box>
          </Alert>
        )}

        {(regStatusLoading || registrationOpen) && (
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          {step === 0 && (
            <StepParentInfo
              data={guardian}
              sessions={sessions}
              update={updateGuardian}
              onNext={() => void goToChildStep()}
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
          {step === 2 && (
            <StepSummary
              guardian={guardian}
              children={children}
              levels={levels}
              sessionName={sessionName}
              onBack={() => setStep(1)}
              onSuccess={(data) => {
                setEnrolled(data);
                setStep(3);
              }}
              onError={setError}
            />
          )}
          {step === 3 && <StepIdCard enrolled={enrolled} />}
        </Paper>
        )}
      </Container>
  );
}
