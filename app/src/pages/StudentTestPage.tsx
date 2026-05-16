import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import FlagIcon from '@mui/icons-material/Flag';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { apiJson, parseApiError } from '../api/http';
import { toastError } from '../feedback/toast';
import { gradeChipColor } from '../utils/grading';

const STUDENT_REG_KEY = 'jbs_student_reg';

type Question = {
  id: number;
  prompt: string;
  choices: string[];
  position: number;
  selection_mode: 'single' | 'multiple';
};

type TestResult = {
  score: number;
  max_score: number;
  percent?: number;
  passed: boolean;
  module_name: string;
  submitted_at?: string;
  correct_count?: number;
  question_count?: number;
  message?: string;
};

type TestStart = {
  test_id: number;
  module_id: number;
  module_name: string;
  session_name: string;
  level_name: string;
  already_submitted: boolean;
  result: TestResult | null;
  questions: Question[];
};

type Phase = 'loading' | 'taking' | 'result';

function hasAnswer(q: Question, selected: number[]): boolean {
  if (q.selection_mode === 'single') {
    return selected.length === 1;
  }
  return selected.length > 0;
}

export function StudentTestPage() {
  const { testId } = useParams<{ testId: string }>();
  const [searchParams] = useSearchParams();
  const regFromUrl = searchParams.get('reg')?.trim() ?? '';
  const [reg] = useState(() => regFromUrl || sessionStorage.getItem(STUDENT_REG_KEY) || '');

  const [phase, setPhase] = useState<Phase>('loading');
  const [meta, setMeta] = useState<TestStart | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const portalHref = reg ? `/student?reg=${encodeURIComponent(reg)}` : '/student';

  const loadTest = useCallback(async () => {
    if (!testId || !reg) {
      setError('Registration number is required. Open this test from the student portal.');
      setPhase('result');
      return;
    }

    setPhase('loading');
    setError(null);
    try {
      const r = await apiJson<{ data: TestStart }>(`/api/v1/student/tests/${testId}/questions`, {
        method: 'POST',
        json: { registration_number: reg },
      });
      const data = r.data;
      setMeta(data);
      sessionStorage.setItem(STUDENT_REG_KEY, reg);

      if (data.already_submitted && data.result) {
        setResult(data.result);
        setPhase('result');
        return;
      }

      const qs = data.questions.map((q) => ({
        ...q,
        selection_mode: q.selection_mode === 'multiple' ? 'multiple' : 'single',
      }));
      setQuestions(qs);
      setAnswers({});
      setFlagged(new Set());
      setCurrentIndex(0);
      setResult(null);
      setPhase('taking');
    } catch (e) {
      setError(parseApiError(e));
      setPhase('result');
    }
  }, [reg, testId]);

  useEffect(() => {
    void loadTest();
  }, [loadTest]);

  const current = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const unanswered = useMemo(
    () => questions.filter((q) => !hasAnswer(q, answers[q.id] ?? [])),
    [questions, answers],
  );

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) {
        next.delete(currentIndex);
      } else {
        next.add(currentIndex);
      }
      return next;
    });
  };

  const goTo = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  };

  const doSubmit = async () => {
    if (!testId) return;
    setSubmitting(true);
    setError(null);
    const payload: Record<string, number | number[]> = {};
    for (const q of questions) {
      const selected = answers[q.id] ?? [];
      if (!hasAnswer(q, selected)) {
        continue;
      }
      if (q.selection_mode === 'single') {
        payload[String(q.id)] = selected[0];
      } else {
        payload[String(q.id)] = [...selected].sort((a, b) => a - b);
      }
    }

    try {
      const r = await apiJson<{ data: TestResult }>(`/api/v1/student/tests/${testId}/submit`, {
        method: 'POST',
        json: { registration_number: reg, answers: payload },
      });
      setResult(r.data);
      setPhase('result');
      setSubmitOpen(false);
    } catch (e) {
      toastError(parseApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const requestSubmit = () => {
    if (unanswered.length > 0) {
      setSubmitOpen(true);
      return;
    }
    void doSubmit();
  };

  if (!reg) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Enter your registration number on the student portal first.
        </Alert>
        <Button component={RouterLink} to="/student" variant="contained">
          Go to student portal
        </Button>
      </Container>
    );
  }

  if (phase === 'loading') {
    return (
      <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (phase === 'result') {
    const display = result ?? meta?.result;
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
        <Button component={RouterLink} to={portalHref} sx={{ mb: 2 }}>
          ← Back to portal
        </Button>

        {error && !display && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {display && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="overline" color="text.secondary">
              {display.module_name}
            </Typography>
            <Typography variant="h4" sx={{ mt: 1, mb: 2 }}>
              {meta?.already_submitted ? 'Test already completed' : 'Your score'}
            </Typography>
            <Typography
              variant="h2"
              fontWeight={700}
              color={display.passed ? 'success.main' : 'warning.main'}
            >
              {display.score}%
            </Typography>
            {display.correct_count != null && display.question_count != null && (
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {display.correct_count} of {display.question_count} questions correct
              </Typography>
            )}
            <Chip
              sx={{ mt: 2 }}
              label={display.passed ? 'Passed (≥40%)' : 'Below pass mark'}
              color={gradeChipColor(display.passed)}
            />
            {display.message && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {display.message}
              </Typography>
            )}
            <Button
              component={RouterLink}
              to={portalHref}
              variant="contained"
              fullWidth
              sx={{ mt: 4 }}
            >
              Return to portal
            </Button>
          </Paper>
        )}
      </Container>
    );
  }

  if (!current || !meta) {
    return null;
  }

  const selected = answers[current.id] ?? [];
  const isFlagged = flagged.has(currentIndex);
  const isLast = currentIndex === questions.length - 1;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 2, px: 2 }}>
        <Container maxWidth="md" disableGutters>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Button
              component={RouterLink}
              to={portalHref}
              size="small"
              sx={{ color: 'inherit', flexShrink: 0 }}
            >
              ← Exit
            </Button>
            <Box sx={{ textAlign: 'center', minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {meta.module_name}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }} noWrap>
                {meta.session_name} · {meta.level_name}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ flexShrink: 0 }}>
              {currentIndex + 1}/{questions.length}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ mt: 1.5, bgcolor: 'rgba(255,255,255,0.25)', '& .MuiLinearProgress-bar': { bgcolor: 'common.white' } }}
          />
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ mt: 3, px: { xs: 2, sm: 3 } }}>
        <Paper sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Typography variant="overline" color="text.secondary">
              Question {currentIndex + 1}
            </Typography>
            {isFlagged && <Chip size="small" icon={<FlagIcon />} label="Flagged" color="warning" />}
          </Stack>
          <Typography variant="h6" sx={{ mt: 1, mb: 2 }}>
            {current.prompt}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
            {current.selection_mode === 'multiple' ? 'Select all that apply.' : 'Select one answer.'}
          </Typography>

          {current.selection_mode === 'multiple' ? (
            <Stack spacing={0.5}>
              {current.choices.map((c, i) => (
                <FormControlLabel
                  key={`${current.id}-${i}`}
                  control={
                    <Checkbox
                      checked={selected.includes(i)}
                      onChange={() => {
                        setAnswers((a) => {
                          const next = new Set(a[current.id] ?? []);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return { ...a, [current.id]: [...next].sort((x, y) => x - y) };
                        });
                      }}
                    />
                  }
                  label={c}
                />
              ))}
            </Stack>
          ) : (
            <RadioGroup
              value={selected[0] !== undefined ? String(selected[0]) : ''}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [current.id]: [Number(e.target.value)] }))
              }
            >
              {current.choices.map((c, i) => (
                <FormControlLabel key={`${current.id}-${i}`} value={String(i)} control={<Radio />} label={c} />
              ))}
            </RadioGroup>
          )}
        </Paper>

        <Stack
          direction="row"
          flexWrap="wrap"
          gap={0.75}
          justifyContent="center"
          sx={{ mt: 2.5 }}
        >
          {questions.map((q, idx) => {
            const answered = hasAnswer(q, answers[q.id] ?? []);
            const isCurrent = idx === currentIndex;
            const isQFlagged = flagged.has(idx);
            return (
              <Button
                key={q.id}
                size="small"
                variant={isCurrent ? 'contained' : 'outlined'}
                color={isQFlagged ? 'warning' : answered ? 'primary' : 'inherit'}
                onClick={() => goTo(idx)}
                sx={{ minWidth: 40 }}
              >
                {idx + 1}
              </Button>
            );
          })}
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ mt: 3 }}
        >
          <Button
            variant="outlined"
            disabled={currentIndex === 0}
            onClick={() => goTo(currentIndex - 1)}
          >
            Previous
          </Button>

          <Button
            variant={isFlagged ? 'contained' : 'outlined'}
            color="warning"
            startIcon={isFlagged ? <FlagIcon /> : <FlagOutlinedIcon />}
            onClick={toggleFlag}
          >
            {isFlagged ? 'Unflag' : 'Flag for review'}
          </Button>

          {isLast ? (
            <Button variant="contained" onClick={requestSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit test'}
            </Button>
          ) : (
            <Button variant="contained" onClick={() => goTo(currentIndex + 1)}>
              Next
            </Button>
          )}
        </Stack>

        {!isLast && (
          <Button fullWidth variant="text" sx={{ mt: 1 }} onClick={requestSubmit} disabled={submitting}>
            Submit test now
          </Button>
        )}
      </Container>

      <Dialog open={submitOpen} onClose={() => !submitting && setSubmitOpen(false)}>
        <DialogTitle>Submit with unanswered questions?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {unanswered.length} question{unanswered.length === 1 ? '' : 's'} still have no answer.
            Unanswered questions will be marked wrong.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitOpen(false)} disabled={submitting}>
            Go back
          </Button>
          <Button variant="contained" onClick={() => void doSubmit()} disabled={submitting}>
            Submit anyway
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
