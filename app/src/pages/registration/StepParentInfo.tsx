import { useState } from 'react';
import { Button, MenuItem, Stack, TextField } from '@mui/material';
import { GuardianRegistrationFields } from './GuardianRegistrationFields';
import { FormSection } from './FormLayout';
import type { GuardianInfo, SessionOption } from './types';
import { validateGuardian } from './validation';

type Props = {
  data: GuardianInfo;
  sessions: SessionOption[];
  update: (data: Partial<GuardianInfo>) => void;
  onNext: () => void;
  nextLoading?: boolean;
};

export function StepParentInfo({ data, sessions, update, onNext, nextLoading }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleNext = () => {
    const nextErrors = validateGuardian(data);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onNext();
  };

  const patchGuardian = (patch: Partial<GuardianInfo>) => {
    update(patch);
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(patch).forEach((k) => delete next[k]);
      return next;
    });
  };

  return (
    <Stack spacing={3}>
      <FormSection title="Programme">
        <TextField
          select
          label="Session / programme"
          value={data.session_slug}
          onChange={(e) => update({ session_slug: e.target.value })}
          error={Boolean(errors.session_slug)}
          helperText={errors.session_slug}
          required
          fullWidth
        >
          {sessions.map((s) => (
            <MenuItem key={s.id} value={s.slug} disabled={s.registration_is_open === false}>
              {s.name}
              {s.registration_is_open === false ? ' (registration closed)' : ''}
            </MenuItem>
          ))}
        </TextField>
      </FormSection>

      <GuardianRegistrationFields
        values={data}
        errors={errors}
        onChange={patchGuardian}
      />

      <Button variant="contained" onClick={handleNext} disabled={nextLoading}>
        {nextLoading ? 'Loading…' : 'Next'}
      </Button>
    </Stack>
  );
}
