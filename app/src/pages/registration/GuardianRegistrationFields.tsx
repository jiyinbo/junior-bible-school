import { MenuItem, TextField } from '@mui/material';
import { UkPhoneTextField } from './ContactFields';
import { GUARDIAN_RELATIONSHIPS } from './constants';
import { FormRow, FormSection } from './FormLayout';
import type { GuardianInfo } from './types';

type Props = {
  values: Pick<GuardianInfo, 'guardian_name' | 'guardian_relationship' | 'guardian_phone'>;
  errors: Record<string, string>;
  onChange: (patch: Partial<GuardianInfo>) => void;
};

export function GuardianRegistrationFields({ values, errors, onChange }: Props) {
  return (
    <FormSection title="Parent / guardian">
      <TextField
        label="Parent / guardian name"
        value={values.guardian_name}
        onChange={(e) => onChange({ guardian_name: e.target.value })}
        error={Boolean(errors.guardian_name)}
        helperText={errors.guardian_name}
        required
        fullWidth
      />
      <FormRow>
        <TextField
          select
          label="Relationship to child"
          value={values.guardian_relationship}
          onChange={(e) => onChange({ guardian_relationship: e.target.value })}
          error={Boolean(errors.guardian_relationship)}
          helperText={errors.guardian_relationship}
          required
          fullWidth
        >
          {GUARDIAN_RELATIONSHIPS.map((rel) => (
            <MenuItem key={rel} value={rel}>
              {rel}
            </MenuItem>
          ))}
        </TextField>
        <UkPhoneTextField
          label="Parent / guardian phone"
          fieldLabel="Parent / guardian phone"
          value={values.guardian_phone}
          onChange={(phone) => onChange({ guardian_phone: phone })}
          error={errors.guardian_phone}
          required
        />
      </FormRow>
    </FormSection>
  );
}
