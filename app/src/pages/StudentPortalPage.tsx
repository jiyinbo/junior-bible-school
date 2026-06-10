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
} from '@mui/material';
import { FormRowButton, InlineFormRow } from '../components/InlineFormRow';
import { PortalSection } from '../components/PortalSection';
import {
  StudentModulesTable,
  StudentProgressPanel,
  type StudentProgressData,
} from '../components/StudentProgressPanel';
import { TimetableGrid, type TimetableGridData } from '../components/TimetableGrid';
import { apiJson, downloadPdf } from '../api/http';

const STUDENT_REG_KEY = 'jbs_student_reg';

type SectionId = 'modules' | 'timetable' | 'openTests' | 'documents';

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
  };
}

export function StudentPortalPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const regFromUrl = searchParams.get('reg')?.trim() ?? '';

  const [reg, setReg] = useState(() => regFromUrl || sessionStorage.getItem(STUDENT_REG_KEY) || '');
  const [lookup, setLookup] = useState<LookupData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<SectionId, boolean>>({
    modules: false,
    timetable: false,
    openTests: true,
    documents: false,
  });

  useEffect(() => {
    if (regFromUrl) {
      setReg(regFromUrl);
    }
  }, [regFromUrl]);

  const doLookup = async (registrationNumber?: string) => {
    const num = (registrationNumber ?? reg).trim();
    if (!num) return;
    setError(null);
    setLookup(null);
    try {
      const r = await apiJson<{ data: LookupData }>('/api/v1/student/lookup', {
        method: 'POST',
        json: { registration_number: num },
      });
      setLookup(r.data);
      setExpanded(defaultExpandedSections(r.data));
      setReg(num);
      sessionStorage.setItem(STUDENT_REG_KEY, num);
    } catch {
      setError('Could not find that registration number.');
    }
  };

  useEffect(() => {
    if (regFromUrl) {
      void doLookup(regFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only auto-lookup when URL has reg
  }, [regFromUrl]);

  const setSectionExpanded = (id: SectionId, open: boolean) => {
    setExpanded((prev) => ({ ...prev, [id]: open }));
  };

  const startTest = (testId: number) => {
    navigate(`/student/tests/${testId}?reg=${encodeURIComponent(reg)}`);
  };

  const dl = async (kind: 'id-card' | 'statement' | 'certificate') => {
    setError(null);
    try {
      await downloadPdf(`/api/v1/student/documents/${kind}`, { registration_number: reg }, `jbs-${kind}.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
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
      <Paper sx={{ p: 3, mb: 3 }}>
        <InlineFormRow>
          <TextField
            fullWidth
            size="small"
            label="Registration number"
            value={reg}
            onChange={(e) => setReg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void doLookup()}
            sx={{ flex: 1, minWidth: 0 }}
          />
          <FormRowButton onClick={() => void doLookup()}>Continue</FormRowButton>
        </InlineFormRow>
      </Paper>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {lookup && (
        <Stack spacing={2}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6">{lookup.full_name}</Typography>
            <Typography color="text.secondary">
              {lookup.session_name} · {lookup.level_name}
            </Typography>
            <Typography sx={{ mt: 1 }}>Reg: {lookup.registration_number}</Typography>
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
                ? 'ID card, statement, and certificate'
                : 'ID card available · statement & certificate after tier completion'
            }
            expanded={expanded.documents}
            onExpandedChange={(open) => setSectionExpanded('documents', open)}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button variant="outlined" fullWidth onClick={() => void dl('id-card')}>
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
        </Stack>
      )}
    </Container>
  );
}
