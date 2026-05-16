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
  child: ChildForm;
  levels: LevelOption[];
  onBack: () => void;
  onSuccess: (enrolled: EnrolledParticipant) => void;
  onError: (message: string | null) => void;
};

function levelName(levels: LevelOption[], id: number | '') {
  return levels.find((l) => l.id === id)?.name ?? '—';
}

export function AdminStepSummary({
  sessionName,
  sessionId,
  guardian,
  child,
  levels,
  onBack,
  onSuccess,
  onError,
}: Props) {
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (child.jbs_level_id === '') return;
    setSubmitting(true);
    onError(null);
    try {
      const guardianPayload = normalizeGuardianContacts(guardian);
      const childPayload = normalizeChildContacts(child);
      const r = await apiJson<{ data: { registration_number: string } }>('/api/v1/admin/registrations', {
        method: 'POST',
        json: {
          jbs_session_id: sessionId,
          jbs_level_id: childPayload.jbs_level_id,
          guardian_name: guardianPayload.guardian_name,
          guardian_relationship: guardianPayload.guardian_relationship,
          guardian_phone: guardianPayload.guardian_phone,
          first_name: childPayload.first_name,
          last_name: childPayload.last_name,
          email: childPayload.email,
          phone: childPayload.phone,
          gender: childPayload.gender,
          date_of_birth: childPayload.date_of_birth,
          nationality: childPayload.nationality,
          address: childPayload.address,
          born_again: childPayload.born_again,
          date_of_new_birth: childPayload.date_of_new_birth || null,
          new_birth_location: childPayload.new_birth_location || null,
          place_of_worship: childPayload.place_of_worship,
          place_of_worship_address: childPayload.place_of_worship_address,
          pastor_name: childPayload.pastor_name,
          activity_group: childPayload.activity_group,
          current_school: childPayload.current_school,
          current_school_year: childPayload.current_school_year,
          allergies: childPayload.allergies || null,
          next_of_kin_name: childPayload.next_of_kin_name,
        },
      });
      toastSuccess(`Student registered: ${r.data.registration_number}`);
      onSuccess({
        registration_number: r.data.registration_number,
        participant_name: `${child.first_name} ${child.last_name}`,
        session_name: sessionName,
        level_name: levelName(levels, child.jbs_level_id),
      });
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

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Student: {child.first_name} {child.last_name}
        </Typography>
        <Typography variant="body2">Level: {levelName(levels, child.jbs_level_id)}</Typography>
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
          <Typography variant="body2">Allergies: {child.allergies}</Typography>
        )}
      </Paper>

      <Typography variant="body2" color="text.secondary">
        Admin registration bypasses public registration windows. Confirm details before submitting.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button variant="contained" onClick={() => void submit()} disabled={submitting}>
          {submitting ? 'Registering…' : 'Register student'}
        </Button>
      </Box>
    </Stack>
  );
}
