import { useEffect, useMemo, useState } from 'react';
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
import { GradingKeyTable } from '../components/GradingKeyTable';
import { PortalSection } from '../components/PortalSection';
import { TimetableGrid, type TimetableGridData } from '../components/TimetableGrid';
import { apiJson, downloadPdf } from '../api/http';
import type { GradingBand } from '../utils/grading';

const STUDENT_REG_KEY = 'jbs_student_reg';

type SectionId = 'timetable' | 'openTests' | 'completedTests' | 'gradingKey' | 'documents';

type Progress = {
  attendance_days: number;
  tests_total: number;
  tests_taken: number;
  tests_passed: number;
  level_completed: boolean;
  overall_percent: number | null;
  overall_grade_label: string | null;
  overall_grade_short: string | null;
  grading_scale: GradingBand[];
};

type OpenTest = { test_id: number; module_id: number; module_name: string };

type CompletedTest = OpenTest & {
  score: number;
  max_score: number;
  percent: number;
  passed: boolean;
  submitted_at: string | null;
};

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
  completed_tests: CompletedTest[];
  level_completed: boolean;
  documents_available: boolean;
  progress: Progress;
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
  const completed = (lookup.completed_tests ?? []).length;
  const open = lookup.open_tests.length;

  return {
    timetable: lookup.programme_phase === 'ongoing',
    openTests: open > 0,
    completedTests: completed > 0 && open === 0,
    gradingKey: false,
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
    timetable: false,
    openTests: true,
    completedTests: true,
    gradingKey: false,
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

  const completedTests = useMemo(() => lookup?.completed_tests ?? [], [lookup]);
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
        <Stack spacing={1.5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6">{lookup.full_name}</Typography>
            <Typography color="text.secondary">
              {lookup.session_name} · {lookup.level_name}
            </Typography>
            <Typography sx={{ mt: 1 }}>Reg: {lookup.registration_number}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`Attendance: ${lookup.progress.attendance_days} days`} />
              <Chip
                size="small"
                label={`Tests completed: ${lookup.progress.tests_taken}/${lookup.progress.tests_total}`}
              />
              <Chip
                size="small"
                color={lookup.level_completed ? 'success' : 'default'}
                label={lookup.level_completed ? 'Tier completed' : 'Tier in progress'}
              />
            </Stack>
            {lookup.completion_message && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {lookup.completion_message}
              </Alert>
            )}
          </Paper>

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

          {completedTests.length > 0 && (
            <PortalSection
              title="Completed tests"
              subtitle="Tests you have submitted · results appear on your statement of result"
              expanded={expanded.completedTests}
              onExpandedChange={(open) => setSectionExpanded('completedTests', open)}
              trailing={<Chip size="small" label={String(completedTests.length)} />}
            >
              <List disablePadding>
                {completedTests.map((t) => (
                  <ListItem
                    key={t.test_id}
                    disableGutters
                    secondaryAction={<Chip size="small" color="success" label="Completed" />}
                  >
                    <ListItemText
                      primary={t.module_name}
                      secondary={
                        t.submitted_at
                          ? `Submitted ${new Date(t.submitted_at).toLocaleString()}`
                          : undefined
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </PortalSection>
          )}

          {(lookup.progress.grading_scale ?? []).length > 0 && (
            <PortalSection
              title="Grading scale"
              subtitle="How your overall average maps to grades"
              expanded={expanded.gradingKey}
              onExpandedChange={(open) => setSectionExpanded('gradingKey', open)}
            >
              <GradingKeyTable scale={lookup.progress.grading_scale} compact />
            </PortalSection>
          )}

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
