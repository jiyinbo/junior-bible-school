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
import { toastSuccess } from '../../feedback/toast';
import { apiJson, parseApiError } from '../../api/http';
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

function normalizeIndices(indices: number[], choiceCount: number): number[] {
  const valid = [...new Set(indices.filter((i) => i >= 0 && i < choiceCount))].sort((a, b) => a - b);
  return valid.length > 0 ? valid : [0];
}

export function ModuleTestPage() {
  const { isAdmin } = useStaffAuth();
  const { moduleId } = useParams<{ moduleId: string }>();
  const [context, setContext] = useState<ModuleContext | null>(null);
  const [status, setStatus] = useState<string>('draft');
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
        }
        setError(null);
      })
      .catch(() => setError('Could not load test.'))
      .finally(() => setLoading(false));
  }, [moduleId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveQuestions = async () => {
    if (!moduleId) return;
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
        json: { questions: payload },
      });
      toastSuccess('Questions saved.');
      load();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const openTest = async () => {
    if (!moduleId) return;
    setError(null);
    try {
      await apiJson(`/api/v1/admin/modules/${moduleId}/tests/open`, { method: 'POST' });
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

      <Stack direction="row" spacing={1} sx={{ mb: 3 }} flexWrap="wrap">
        <Chip label={`Status: ${status}`} color={isOpen ? 'success' : 'default'} />
        {status !== 'open' && (
          <Button variant="contained" color="success" onClick={() => void openTest()}>
            Open test
          </Button>
        )}
        {status === 'open' && (
          <Button variant="outlined" color="warning" onClick={() => void closeTest()}>
            Close test
          </Button>
        )}
        {canEdit && (
          <Button variant="contained" onClick={() => void saveQuestions()}>
            Save questions
          </Button>
        )}
      </Stack>

      {isOpen && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Close the test before editing questions.
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
