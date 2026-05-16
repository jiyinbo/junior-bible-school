import { useState } from 'react';
import { Button, MenuItem, Stack, TextField } from '@mui/material';
import { FormSection } from '../../registration/FormLayout';
import { GuardianRegistrationFields } from '../../registration/GuardianRegistrationFields';
import type { GuardianInfo } from '../../registration/types';
import { validateAdminGuardian } from '../../registration/validation';

type Session = { id: number; name: string };

type Props = {
  sessionId: number | '';
  sessions: Session[];
  guardian: Pick<GuardianInfo, 'guardian_name' | 'guardian_relationship' | 'guardian_phone'>;
  onSessionChange: (sessionId: number | '') => void;
  onGuardianChange: (patch: Partial<GuardianInfo>) => void;
  onNext: () => void;
  nextLoading?: boolean;
};

export function AdminStepProgramme({
  sessionId,
  sessions,
  guardian,
  onSessionChange,
  onGuardianChange,
  onNext,
  nextLoading,
}: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const patchGuardian = (patch: Partial<GuardianInfo>) => {
    onGuardianChange(patch);
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(patch).forEach((k) => delete next[k]);
      return next;
    });
  };

  const handleNext = () => {
    const nextErrors = validateAdminGuardian(sessionId, guardian);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onNext();
  };

  return (
    <Stack spacing={3}>
      <FormSection title="Programme">
        <TextField
          select
          label="Session / programme"
          value={sessionId}
          onChange={(e) => {
            const v = e.target.value;
            onSessionChange(v === '' ? '' : Number(v));
            setErrors((prev) => {
              const next = { ...prev };
              delete next.session;
              return next;
            });
          }}
          error={Boolean(errors.session)}
          helperText={errors.session}
          required
          fullWidth
        >
          {sessions.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>
      </FormSection>

      <GuardianRegistrationFields values={guardian} errors={errors} onChange={patchGuardian} />

      <Button variant="contained" onClick={handleNext} disabled={nextLoading}>
        {nextLoading ? 'Loading…' : 'Next'}
      </Button>
    </Stack>
  );
}
