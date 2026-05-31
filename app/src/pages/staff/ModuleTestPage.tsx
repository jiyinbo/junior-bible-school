import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { toastSuccess } from '../../feedback/toast';
import { apiJson, downloadPdfGet, parseApiError } from '../../api/http';
import { PageHeader } from '../../staff/PageHeader';
import { useStaffAuth } from '../../staff/StaffAuthContext';

type QuestionDraft = {
  prompt: string;
  choices: string[];
  correct_indices: number[];
};

type TestData = {
  id: number;
  status: string;
  duration_minutes: number | null;
  closes_at: string | null;
  remaining_seconds: number | null;
  questions: QuestionDraft[];
};

type ModuleContext = {
  module: { id: number; name: string };
  level: { id: number; name: string; registration_prefix: string };
  session: { id: number; name: string };
};

type TestShowResponse = ModuleContext & {
  test: (TestData & { questions: QuestionDraft[] }) | null;
};

const emptyQuestion = (): QuestionDraft => ({
  prompt: '',
  choices: ['', ''],
  correct_indices: [0],
});

const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 240;

function isValidDuration(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= MIN_DURATION_MINUTES && minutes <= MAX_DURATION_MINUTES;
}

function normalizeIndices(indices: number[], choiceCount: number): number[] {
  const valid = [...new Set(indices.filter((i) => i >= 0 && i < choiceCount))].sort((a, b) => a - b);
  return valid.length > 0 ? valid : [0];
}

export function ModuleTestPage() {
  const { isAdmin } = useStaffAuth();
  const { moduleId } = useParams<{ moduleId: string }>();
  const [context, setContext] = useState<ModuleContext | null>(null);
  const [status, setStatus] = useState<string>('draft');
  const [durationMinutes, setDurationMinutes] = useState<number>(10);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [savedQuestionCount, setSavedQuestionCount] = useState(0);
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!moduleId) return;
    setLoading(true);
    apiJson<{ data: TestShowResponse }>(`/api/v1/admin/modules/${moduleId}/tests`)
      .then((r) => {
        const { test, ...moduleCtx } = r.data;
        setContext(moduleCtx);
        if (test) {
          setStatus(test.status);
          setDurationMinutes(test.duration_minutes ?? 10);
          setRemainingSeconds(test.remaining_seconds);
          setSavedQuestionCount(test.questions.length);
          setQuestions(
            test.questions.length > 0
              ? test.questions.map((q) => ({
                  prompt: q.prompt,
                  choices: [...q.choices],
                  correct_indices: normalizeIndices(q.correct_indices ?? [0], q.choices.length),
                }))
              : [emptyQuestion()],
          );
        } else {
          setStatus('draft');
          setQuestions([emptyQuestion()]);
          setSavedQuestionCount(0);
        }
        setError(null);
      })
      .catch(() => setError('Could not load test.'))
      .finally(() => setLoading(false));
  }, [moduleId]);

  useEffect(() => {
    load();
  }, [load]);

  const formatRemaining = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const saveQuestions = async () => {
    if (!moduleId) return;
    if (!isValidDuration(durationMinutes)) {
      setError(`Enter a test duration between ${MIN_DURATION_MINUTES} and ${MAX_DURATION_MINUTES} minutes.`);
      return;
    }
    setError(null);
    const payload = questions
      .filter((q) => q.prompt.trim())
      .map((q, i) => {
        const choices =
          q.choices.filter((c) => c.trim()).length >= 2 ? q.choices.map((c) => c.trim()) : ['A', 'B'];
        return {
          prompt: q.prompt.trim(),
          choices,
          correct_indices: normalizeIndices(q.correct_indices, choices.length),
          position: i,
        };
      });
    if (payload.length === 0) {
      setError('Add at least one question with a prompt.');
      return;
    }
    try {
      await apiJson(`/api/v1/admin/modules/${moduleId}/tests/questions`, {
        method: 'POST',
        json: { questions: payload, duration_minutes: durationMinutes },
      });
      toastSuccess('Questions saved.');
      load();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const openTest = async () => {
    if (!moduleId) return;
    if (!isValidDuration(durationMinutes)) {
      setError(`Enter a test duration between ${MIN_DURATION_MINUTES} and ${MAX_DURATION_MINUTES} minutes.`);
      return;
    }
    setError(null);
    try {
      await apiJson(`/api/v1/admin/modules/${moduleId}/tests/open`, {
        method: 'POST',
        json: { duration_minutes: durationMinutes },
      });
      toastSuccess('Test is now open for students.');
      load();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const closeTest = async () => {
    if (!moduleId) return;
    setError(null);
    try {
      await apiJson(`/api/v1/admin/modules/${moduleId}/tests/close`, { method: 'POST' });
      toastSuccess('Test closed.');
      load();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const downloadPaperTest = async () => {
    if (!moduleId) return;
    setError(null);
    try {
      const slug = context?.module.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || moduleId;
      await downloadPdfGet(`/api/v1/admin/modules/${moduleId}/tests/pdf`, `jbs-test-${slug}.pdf`);
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const updateQuestion = (index: number, patch: Partial<QuestionDraft>) => {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const toggleCorrect = (questionIndex: number, choiceIndex: number) => {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== questionIndex) return q;
        const set = new Set(q.correct_indices);
        if (set.has(choiceIndex)) {
          if (set.size <= 1) return q;
          set.delete(choiceIndex);
        } else {
          set.add(choiceIndex);
        }
        return { ...q, correct_indices: [...set].sort((a, b) => a - b) };
      }),
    );
  };

  const isOpen = status === 'open';
  const canEdit = !isOpen;
  const durationInvalid = !isValidDuration(durationMinutes);

  if (!moduleId) return null;

  return (
    <>
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
        {context && isAdmin && (
          <Button
            component={RouterLink}
            to={`/staff/sessions/${context.session.id}`}
            size="small"
          >
            ← {context.session.name}
          </Button>
        )}
        <Button component={RouterLink} to="/staff/modules" size="small">
          My modules
        </Button>
      </Stack>
      <PageHeader
        title={context ? context.module.name : 'Module test'}
        subtitle={
          context
            ? `${context.session.name} · ${context.level.name} (${context.level.registration_prefix})`
            : moduleId
              ? `Module #${moduleId}`
              : undefined
        }
      />
      {loading && <Typography color="text.secondary">Loading…</Typography>}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'auto auto 1fr' },
            alignItems: 'center',
          }}
        >
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gridColumn: { xs: '1', md: '1' } }}>
            <Chip label={`Status: ${status}`} color={isOpen ? 'success' : 'default'} sx={{ alignSelf: 'center' }} />
            {isOpen && remainingSeconds != null && (
              <Chip
                label={remainingSeconds > 0 ? `Time left: ${formatRemaining(remainingSeconds)}` : 'Closing…'}
                color="warning"
                variant="outlined"
                sx={{ alignSelf: 'center' }}
              />
            )}
          </Stack>

          {!isOpen && (
            <TextField
              type="number"
              label="Duration (minutes)"
              value={durationMinutes}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (e.target.value === '' || Number.isNaN(next)) {
                  setDurationMinutes(0);
                  return;
                }
                setDurationMinutes(Math.trunc(next));
              }}
              error={durationInvalid}
              helperText={
                durationInvalid
                  ? `Enter ${MIN_DURATION_MINUTES}–${MAX_DURATION_MINUTES} minutes`
                  : undefined
              }
              size="small"
              fullWidth
              inputProps={{ min: MIN_DURATION_MINUTES, max: MAX_DURATION_MINUTES, step: 1 }}
              sx={{ gridColumn: { xs: '1', md: '2' }, maxWidth: { md: 240 } }}
            />
          )}

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            sx={{
              gridColumn: { xs: '1', md: isOpen ? '2 / -1' : '3' },
              justifyContent: { md: 'flex-end' },
            }}
          >
            {status !== 'open' && (
              <Button
                variant="contained"
                color="success"
                onClick={() => void openTest()}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Open test
              </Button>
            )}
            {status === 'open' && (
              <Button
                variant="outlined"
                color="warning"
                onClick={() => void closeTest()}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Close test
              </Button>
            )}
            {canEdit && (
              <Button
                variant="contained"
                onClick={() => void saveQuestions()}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Save questions
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<PictureAsPdfIcon />}
              onClick={() => void downloadPaperTest()}
              disabled={savedQuestionCount === 0}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Download paper test
            </Button>
          </Stack>
        </Box>

        {!isOpen && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            Test closes automatically after the entered duration when opened.
          </Typography>
        )}
      </Paper>

      {savedQuestionCount > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Download a printable PDF for students taking this test on paper. Correct answers are not included.
        </Typography>
      )}

      {isOpen && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Test is open for {durationMinutes} minutes and will close automatically when time runs out.
          Close the test manually before editing questions.
        </Alert>
      )}

      {canEdit && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Click a choice chip to mark it correct. One chip: students see radio buttons (pick one).
          More than one: students see checkboxes and must select all correct options.
        </Typography>
      )}

      {questions.map((q, qi) => (
        <Paper key={qi} sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography fontWeight={600}>Question {qi + 1}</Typography>
            {canEdit && questions.length > 1 && (
              <IconButton size="small" onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
          <TextField
            label="Prompt"
            value={q.prompt}
            onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
            fullWidth
            multiline
            disabled={!canEdit}
            sx={{ mb: 2 }}
          />
          {q.choices.map((choice, ci) => {
            const isCorrect = q.correct_indices.includes(ci);
            return (
              <Stack key={ci} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Chip
                  size="small"
                  label={isCorrect ? 'Correct' : 'Mark correct'}
                  color={isCorrect ? 'primary' : 'default'}
                  variant={isCorrect ? 'filled' : 'outlined'}
                  onClick={canEdit ? () => toggleCorrect(qi, ci) : undefined}
                  sx={{ minWidth: 100, cursor: canEdit ? 'pointer' : 'default' }}
                />
                <TextField
                  size="small"
                  label={`Choice ${ci + 1}`}
                  value={choice}
                  onChange={(e) => {
                    const choices = [...q.choices];
                    choices[ci] = e.target.value;
                    updateQuestion(qi, { choices });
                  }}
                  fullWidth
                  disabled={!canEdit}
                />
                {canEdit && q.choices.length > 2 && (
                  <IconButton
                    size="small"
                    onClick={() => {
                      const choices = q.choices.filter((_, i) => i !== ci);
                      const correct_indices = q.correct_indices
                        .filter((i) => i !== ci)
                        .map((i) => (i > ci ? i - 1 : i));
                      updateQuestion(qi, {
                        choices,
                        correct_indices: normalizeIndices(correct_indices, choices.length),
                      });
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            );
          })}
          {canEdit && (
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() =>
                updateQuestion(qi, {
                  choices: [...q.choices, ''],
                })
              }
            >
              Add choice
            </Button>
          )}
        </Paper>
      ))}

      {canEdit && (
        <Button startIcon={<AddIcon />} onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}>
          Add question
        </Button>
      )}
    </>
  );
}
