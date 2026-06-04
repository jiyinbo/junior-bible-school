import { MenuItem, TextField } from '@mui/material';
import { EmailTextField, UkPhoneTextField } from './ContactFields';
import { GUARDIAN_RELATIONSHIPS, LABEL_GUARDIAN_FULL_NAME } from './constants';
import { FormRow, FormSection } from './FormLayout';
import type { GuardianInfo } from './types';

type Props = {
  values: Pick<GuardianInfo, 'guardian_name' | 'guardian_relationship' | 'guardian_phone' | 'guardian_email'>;
  errors: Record<string, string>;
  onChange: (patch: Partial<GuardianInfo>) => void;
};

export function GuardianRegistrationFields({ values, errors, onChange }: Props) {
  return (
    <FormSection title="Parent / guardian">
      <FormRow>
        <TextField
          label={LABEL_GUARDIAN_FULL_NAME}
          placeholder="First name and surname"
          value={values.guardian_name}
          onChange={(e) => onChange({ guardian_name: e.target.value })}
          error={Boolean(errors.guardian_name)}
          helperText={errors.guardian_name}
          required
          fullWidth
        />
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
      </FormRow>
      <FormRow>
        <EmailTextField
          label="Parent / guardian email"
          fieldLabel="Parent / guardian email"
          value={values.guardian_email}
          onChange={(email) => onChange({ guardian_email: email })}
          error={errors.guardian_email}
          required
        />
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
