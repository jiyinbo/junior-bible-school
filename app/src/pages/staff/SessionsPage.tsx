import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { FormRowButton, InlineFormRow } from '../../components/InlineFormRow';
import { toastSuccess } from '../../feedback/toast';
import { apiJson, parseApiError } from '../../api/http';
import { PageHeader } from '../../staff/PageHeader';

type Session = { id: number; name: string; slug: string; is_past: boolean };

export function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    apiJson<{ data: Session[] }>('/api/v1/admin/sessions')
      .then((r) => setSessions(r.data))
      .catch(() => setError('Could not load sessions.'));
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    setError(null);
    try {
      await apiJson('/api/v1/admin/sessions', {
        method: 'POST',
        json: { name: name.trim(), slug: slug.trim() || undefined },
      });
      setName('');
      setSlug('');
      toastSuccess('Session created.');
      load();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Sessions"
        subtitle="Each session is a school year or intake. Add tiers and modules on the session detail page."
      />
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Create session
        </Typography>
        <InlineFormRow>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 160 }}
          />
          <TextField
            label="Slug (optional)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            size="small"
            placeholder="auto-generated if empty"
            sx={{ flex: 1, minWidth: 160 }}
          />
          <FormRowButton onClick={() => void create()}>Save</FormRowButton>
        </InlineFormRow>
      </Paper>
      <Stack spacing={1}>
        {sessions.map((s) => (
          <Paper key={s.id} sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography fontWeight={600}>{s.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {s.slug}
                  {s.is_past ? ' · past' : ''}
                </Typography>
              </Box>
              <Button component={RouterLink} to={`/staff/sessions/${s.id}`} variant="outlined" size="small">
                Manage
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </>
  );
}
