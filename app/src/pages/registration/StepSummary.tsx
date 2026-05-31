import { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { apiJson, parseApiError } from '../../api/http';
import { toastSuccess } from '../../feedback/toast';
import type { ChildForm, EnrolledParticipant, GuardianInfo, LevelOption } from './types';
import { normalizeChildContacts, normalizeGuardianContacts } from './validation';

type Props = {
  guardian: GuardianInfo;
  children: ChildForm[];
  levels: LevelOption[];
  sessionName: string;
  onBack: () => void;
  onSuccess: (enrolled: EnrolledParticipant[]) => void;
  onError: (message: string | null) => void;
};

function levelName(levels: LevelOption[], id: number | '') {
  return levels.find((l) => l.id === id)?.name ?? '—';
}

export function StepSummary({
  guardian,
  children,
  levels,
  sessionName,
  onBack,
  onSuccess,
  onError,
}: Props) {
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!consent) return;
    setSubmitting(true);
    onError(null);
    try {
      const guardianPayload = normalizeGuardianContacts(guardian);
      const r = await apiJson<{ data: EnrolledParticipant[] }>('/api/v1/public/registrations', {
        method: 'POST',
        json: {
          session_slug: guardianPayload.session_slug,
          guardian_name: guardianPayload.guardian_name,
          guardian_relationship: guardianPayload.guardian_relationship,
          guardian_phone: guardianPayload.guardian_phone,
          guardian_email: guardianPayload.guardian_email,
          children: children.map((c) => {
            const child = normalizeChildContacts(c);
            return {
              ...child,
              jbs_level_id: child.jbs_level_id,
              born_again: child.born_again,
              date_of_new_birth: child.date_of_new_birth || null,
              new_birth_location: child.new_birth_location || null,
              allergies: child.allergies || null,
            };
          }),
        },
      });
      toastSuccess('Registration successful');
      onSuccess(r.data);
    } catch (e) {
      onError(parseApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Review submission</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Parent / guardian
        </Typography>
        <Typography variant="body2">Session: {sessionName}</Typography>
        <Typography variant="body2">Name: {guardian.guardian_name}</Typography>
        <Typography variant="body2">Relationship: {guardian.guardian_relationship}</Typography>
        <Typography variant="body2">Phone: {guardian.guardian_phone}</Typography>
        <Typography variant="body2">Email: {guardian.guardian_email}</Typography>
      </Paper>

      <Divider />

      {children.map((child, idx) => (
        <Paper key={`${child.email}-${idx}`} variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Child {idx + 1}: {child.first_name} {child.last_name}
          </Typography>
          <Typography variant="body2">Tier: {levelName(levels, child.jbs_level_id)}</Typography>
          <Typography variant="body2">
            DOB: {child.date_of_birth ? new Date(child.date_of_birth + 'T12:00:00').toLocaleDateString() : '—'}
          </Typography>
          <Typography variant="body2">Email: {child.email}</Typography>
          <Typography variant="body2">Phone: {child.phone}</Typography>
          <Typography variant="body2">School: {child.current_school} ({child.current_school_year})</Typography>
          {child.allergies && (
            <Typography variant="body2">Allergies / medical: {child.allergies}</Typography>
          )}
        </Paper>
      ))}

      <FormControlLabel
        control={<Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />}
        label="I declare that the information provided is true and correct to the best of my knowledge."
      />
      <Typography variant="body2" color="text.secondary">
        Information is used only for JBS administration. See{' '}
        <a href="https://www.winners-chapel.org.uk" target="_blank" rel="noreferrer">
          winners-chapel.org.uk
        </a>{' '}
        for privacy details.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button variant="contained" onClick={() => void submit()} disabled={!consent || submitting}>
          {submitting ? 'Submitting…' : 'Submit'}
        </Button>
      </Box>
    </Stack>
  );
}
