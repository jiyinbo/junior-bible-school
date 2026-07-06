import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Chip,
  Container,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
  Box,
} from '@mui/material';
import { apiJson, parseApiError } from '../api/http';
import type { DocumentData } from './staff/certificates';
import { toastSuccess } from '../feedback/toast';
import { IdCardDialog } from '../components/IdCardPreview';
import { FormRowButton } from '../components/InlineFormRow';
import { PortalSection } from '../components/PortalSection';
import {
  StudentModulesTable,
  StudentProgressPanel,
  type StudentProgressData,
} from '../components/StudentProgressPanel';
import { TimetableGrid, type TimetableGridData } from '../components/TimetableGrid';
import {
  clearStudentSession,
  getStudentPin,
  getStudentReg,
  setStudentSession,
  studentAuthBody,
} from '../student/studentSession';

type SectionId = 'modules' | 'timetable' | 'openTests' | 'documents' | 'security';

type OpenTest = { test_id: number; module_id: number; module_name: string };

type LookupData = {
  registration_number: string;
  full_name: string;
  session_name: string;
  level_name: string;
  session_starts_at: string | null;
  session_ends_at: string | null;
  programme_phase: 'upcoming' | 'ongoing' | 'ended' | 'past';
  timetable_grid: TimetableGridData;
  open_tests: OpenTest[];
  level_completed: boolean;
  documents_available: boolean;
  progress: StudentProgressData;
  completion_message: string | null;
};

function programmePhaseMessage(lookup: LookupData): string | null {
  if (lookup.programme_phase === 'upcoming') {
    return 'Your session has not started yet. Timetable shows planned classes for your tier.';
  }
  if (lookup.programme_phase === 'ongoing') {
    return 'Your session is in progress. See your class timetable below.';
  }
  if (lookup.programme_phase === 'ended' || lookup.programme_phase === 'past') {
    return 'This session has ended. Timetable is shown for reference.';
  }
  return null;
}

function defaultExpandedSections(lookup: LookupData): Record<SectionId, boolean> {
  return {
    modules: false,
    timetable: lookup.programme_phase === 'ongoing',
    openTests: lookup.open_tests.length > 0,
    documents: false,
    security: false,
  };
}

export function StudentPortalPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const regFromUrl = searchParams.get('reg')?.trim() ?? '';

  const [reg, setReg] = useState(() => regFromUrl || getStudentReg());
  const [pin, setPin] = useState(() => getStudentPin());
  const [lookup, setLookup] = useState<LookupData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<SectionId, boolean>>({
    modules: false,
    timetable: false,
    openTests: true,
    documents: false,
    security: false,
  });
  const [idCardOpen, setIdCardOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    if (regFromUrl) {
      setReg(regFromUrl);
    }
  }, [regFromUrl]);

  const doLookup = async (registrationNumber?: string, portalPin?: string) => {
    const num = (registrationNumber ?? reg).trim();
    const authPin = (portalPin ?? pin).trim();
    if (!num || !authPin) {
      setError('Enter your registration number and 4-digit PIN.');
      return;
    }
    setError(null);
    setLookup(null);
    try {
      const r = await apiJson<{ data: LookupData }>('/api/v1/student/lookup', {
        method: 'POST',
        json: studentAuthBody(num, authPin),
      });
      setLookup(r.data);
      setExpanded(defaultExpandedSections(r.data));
      setReg(num);
      setPin(authPin);
      setStudentSession(num, authPin);
    } catch (e) {
      setError(parseApiError(e) || 'Could not sign in. Check your registration number and PIN.');
    }
  };

  useEffect(() => {
    const num = (regFromUrl || getStudentReg()).trim();
    const authPin = getStudentPin().trim();
    if (num && authPin) {
      void doLookup(num, authPin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore session on load or when URL reg changes
  }, [regFromUrl]);

  const signOut = () => {
    clearStudentSession();
    setLookup(null);
    setReg('');
    setPin('');
    setError(null);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setPinMessage(null);
    setPinError(null);
  };

  const setSectionExpanded = (id: SectionId, open: boolean) => {
    setExpanded((prev) => ({ ...prev, [id]: open }));
  };

  const startTest = (testId: number) => {
    navigate(`/student/tests/${testId}?reg=${encodeURIComponent(reg)}`);
  };

  const dl = async (kind: 'statement' | 'certificate') => {
    setError(null);
    try {
      const { data } = await apiJson<{ data: DocumentData }>('/api/v1/student/documents/data', {
        method: 'POST',
        json: studentAuthBody(reg, pin),
      });
      const { generateStatementPdf, generateCertificatePdf } = await import('./staff/certificates');
      const filename = `jbs-${kind}-${data.registration_number}.pdf`;
      if (kind === 'statement') {
        await generateStatementPdf(data, filename);
      } else {
        await generateCertificatePdf(data, filename);
      }
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const updatePin = async () => {
    setPinBusy(true);
    setPinError(null);
    setPinMessage(null);
    try {
      await apiJson('/api/v1/student/pin', {
        method: 'PATCH',
        json: {
          registration_number: reg,
          current_pin: currentPin,
          new_pin: newPin,
          new_pin_confirmation: confirmPin,
        },
      });
      setPin(newPin);
      setStudentSession(reg, newPin);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setPinMessage('Your PIN has been updated.');
      toastSuccess('PIN updated.');
    } catch (e) {
      setPinError(parseApiError(e));
    } finally {
      setPinBusy(false);
    }
  };

  const phaseMessage = lookup ? programmePhaseMessage(lookup) : null;

  return (
    <Container maxWidth="md" sx={{ py: 6, px: { xs: 2, sm: 3 } }}>
      <Button component={RouterLink} to="/" sx={{ mb: 2 }}>
        ← Home
      </Button>
      <Typography variant="h4" gutterBottom>
        Student portal
      </Typography>

      {!lookup && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack spacing={1}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'stretch', sm: 'flex-end' }}
              useFlexGap
            >
              <TextField
                fullWidth
                size="small"
                label="Registration number"
                value={reg}
                onChange={(e) => setReg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void doLookup()}
                sx={{ flex: { sm: 1 }, minWidth: { sm: 0 } }}
              />
              <TextField
                size="small"
                label="PIN"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={(e) => e.key === 'Enter' && void doLookup()}
                sx={{
                  width: { xs: '100%', sm: 132 },
                  flexShrink: 0,
                }}
              />
              <FormRowButton onClick={() => void doLookup()}>Continue</FormRowButton>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
              4-digit PIN from your confirmation email
            </Typography>
          </Stack>
        </Paper>
      )}

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {lookup && (
        <Stack spacing={2}>
          <Paper sx={{ p: 3 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
            >
              <Box>
                <Typography variant="h6">{lookup.full_name}</Typography>
                <Typography color="text.secondary">
                  {lookup.session_name} · {lookup.level_name}
                </Typography>
                <Typography sx={{ mt: 1 }}>Reg: {lookup.registration_number}</Typography>
              </Box>
              <Button variant="outlined" size="small" onClick={signOut} sx={{ flexShrink: 0 }}>
                Sign out
              </Button>
            </Stack>
          </Paper>

          <StudentProgressPanel
            variant="student"
            progress={lookup.progress}
            programmePhase={lookup.programme_phase}
            showModuleTable={false}
          />

          <PortalSection
            title={`Timetable — ${lookup.level_name}`}
            subtitle={
              lookup.timetable_grid.periods.length > 0
                ? `${lookup.timetable_grid.days.length} day${lookup.timetable_grid.days.length === 1 ? '' : 's'}`
                : 'Not set up yet'
            }
            expanded={expanded.timetable}
            onExpandedChange={(open) => setSectionExpanded('timetable', open)}
          >
            {phaseMessage && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {phaseMessage}
              </Alert>
            )}
            {lookup.timetable_grid.periods.length > 0 ? (
              <TimetableGrid grid={lookup.timetable_grid} />
            ) : (
              <Typography color="text.secondary">
                The timetable for your tier has not been set up yet.
              </Typography>
            )}
          </PortalSection>

          <PortalSection
            title="Modules"
            subtitle={`${lookup.progress.tests_taken} / ${lookup.progress.tests_total} submitted — scores are not shown`}
            expanded={expanded.modules}
            onExpandedChange={(open) => setSectionExpanded('modules', open)}
          >
            <StudentModulesTable progress={lookup.progress} variant="student" />
          </PortalSection>

          <PortalSection
            title="Open tests"
            subtitle="Each test can only be taken once"
            expanded={expanded.openTests}
            onExpandedChange={(open) => setSectionExpanded('openTests', open)}
            trailing={
              lookup.open_tests.length > 0 ? (
                <Chip size="small" color="primary" label={String(lookup.open_tests.length)} />
              ) : undefined
            }
          >
            {lookup.open_tests.length === 0 ? (
              <Typography color="text.secondary">No open tests available to take right now.</Typography>
            ) : (
              <List disablePadding>
                {lookup.open_tests.map((t) => (
                  <ListItem
                    key={t.test_id}
                    disableGutters
                    secondaryAction={
                      <Button size="small" variant="contained" onClick={() => startTest(t.test_id)}>
                        Take test
                      </Button>
                    }
                  >
                    <ListItemText primary={t.module_name} />
                  </ListItem>
                ))}
              </List>
            )}
          </PortalSection>

          <PortalSection
            title="Documents (PDF)"
            subtitle={
              lookup.documents_available
                ? 'View ID card · download statement and certificate'
                : 'View ID card · statement & certificate after tier completion'
            }
            expanded={expanded.documents}
            onExpandedChange={(open) => setSectionExpanded('documents', open)}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button variant="outlined" fullWidth onClick={() => setIdCardOpen(true)}>
                ID card
              </Button>
              <Button
                variant="outlined"
                fullWidth
                disabled={!lookup.documents_available}
                onClick={() => void dl('statement')}
              >
                Statement
              </Button>
              <Button
                variant="outlined"
                fullWidth
                disabled={!lookup.documents_available}
                onClick={() => void dl('certificate')}
              >
                Certificate
              </Button>
            </Stack>
          </PortalSection>

          <PortalSection
            title="Portal security"
            subtitle="Change your 4-digit PIN"
            expanded={expanded.security}
            onExpandedChange={(open) => setSectionExpanded('security', open)}
          >
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                useFlexGap
                sx={{ maxWidth: { sm: 720 } }}
              >
                <TextField
                  size="small"
                  label="Current PIN"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  sx={{ flex: { sm: 1 }, minWidth: { sm: 0 } }}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="New PIN"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  sx={{ flex: { sm: 1 }, minWidth: { sm: 0 } }}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Confirm new PIN"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  sx={{ flex: { sm: 1 }, minWidth: { sm: 0 } }}
                  fullWidth
                />
              </Stack>
              <Button
                variant="contained"
                disabled={
                  pinBusy ||
                  currentPin.length !== 4 ||
                  newPin.length !== 4 ||
                  confirmPin.length !== 4
                }
                onClick={() => void updatePin()}
                sx={{ alignSelf: 'flex-start' }}
              >
                {pinBusy ? 'Updating…' : 'Update PIN'}
              </Button>
              {pinMessage && <Alert severity="success">{pinMessage}</Alert>}
              {pinError && <Alert severity="error">{pinError}</Alert>}
            </Stack>
          </PortalSection>

          <IdCardDialog
            open={idCardOpen}
            onClose={() => setIdCardOpen(false)}
            participant={{
              registration_number: lookup.registration_number,
              participant_name: lookup.full_name,
              session_name: lookup.session_name,
              level_name: lookup.level_name,
            }}
            pin={pin}
          />
        </Stack>
      )}
    </Container>
  );
}
