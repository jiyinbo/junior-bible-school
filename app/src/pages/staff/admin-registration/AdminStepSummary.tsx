import { useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { apiJson, parseApiError } from '../../../api/http';
import { toastSuccess } from '../../../feedback/toast';
import type { ChildForm, EnrolledParticipant, GuardianInfo, LevelOption } from '../../registration/types';
import { normalizeChildContacts, normalizeGuardianContacts } from '../../registration/validation';

type Props = {
  sessionName: string;
  sessionId: number;
  guardian: Pick<GuardianInfo, 'guardian_name' | 'guardian_relationship' | 'guardian_phone'>;
  children: ChildForm[];
  levels: LevelOption[];
  onBack: () => void;
  onSuccess: (enrolled: EnrolledParticipant[]) => void;
  onError: (message: string | null) => void;
};

function levelName(levels: LevelOption[], id: number | '') {
  return levels.find((l) => l.id === id)?.name ?? '—';
}

export function AdminStepSummary({
  sessionName,
  sessionId,
  guardian,
  children,
  levels,
  onBack,
  onSuccess,
  onError,
}: Props) {
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (children.length === 0) return;
    setSubmitting(true);
    onError(null);
    try {
      const guardianPayload = normalizeGuardianContacts(guardian);
      const r = await apiJson<{ data: EnrolledParticipant[] }>('/api/v1/admin/registrations', {
        method: 'POST',
        json: {
          jbs_session_id: sessionId,
          guardian_name: guardianPayload.guardian_name,
          guardian_relationship: guardianPayload.guardian_relationship,
          guardian_phone: guardianPayload.guardian_phone,
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
      const count = r.data.length;
      toastSuccess(count === 1 ? 'Student registered' : `${count} students registered`);
      onSuccess(r.data);
    } catch (e) {
      onError(parseApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Review registration</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Parent / guardian
        </Typography>
        <Typography variant="body2">Session: {sessionName}</Typography>
        <Typography variant="body2">Name: {guardian.guardian_name}</Typography>
        <Typography variant="body2">Relationship: {guardian.guardian_relationship}</Typography>
        <Typography variant="body2">Phone: {guardian.guardian_phone}</Typography>
      </Paper>

      <Divider />

      {children.map((child, idx) => (
        <Paper key={`${child.email}-${idx}`} variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Student {idx + 1}: {child.first_name} {child.last_name}
          </Typography>
          <Typography variant="body2">Tier: {levelName(levels, child.jbs_level_id)}</Typography>
          <Typography variant="body2">
            DOB:{' '}
            {child.date_of_birth
              ? new Date(child.date_of_birth + 'T12:00:00').toLocaleDateString()
              : '—'}
          </Typography>
          <Typography variant="body2">Email: {child.email}</Typography>
          <Typography variant="body2">Phone: {child.phone}</Typography>
          <Typography variant="body2">
            School: {child.current_school} ({child.current_school_year})
          </Typography>
          {child.allergies && (
            <Typography variant="body2">Allergies / medical: {child.allergies}</Typography>
          )}
        </Paper>
      ))}

      <Typography variant="body2" color="text.secondary">
        Admin registration bypasses public registration windows. Confirm details before submitting.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button variant="contained" onClick={() => void submit()} disabled={submitting}>
          {submitting
            ? 'Registering…'
            : children.length === 1
              ? 'Register student'
              : `Register ${children.length} students`}
        </Button>
      </Box>
    </Stack>
  );
}
