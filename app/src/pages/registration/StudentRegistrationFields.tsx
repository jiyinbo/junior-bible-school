import {
  Checkbox,
  FormControlLabel,
  MenuItem,
  TextField,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { EmailTextField, UkPhoneTextField } from './ContactFields';
import { NATIONALITIES } from './constants';
import { FormRow, FormSection } from './FormLayout';
import type { ChildForm } from './types';

export type StudentFieldValues = Pick<
  ChildForm,
  | 'first_name'
  | 'last_name'
  | 'gender'
  | 'date_of_birth'
  | 'nationality'
  | 'address'
  | 'phone'
  | 'email'
  | 'born_again'
  | 'date_of_new_birth'
  | 'new_birth_location'
  | 'place_of_worship'
  | 'place_of_worship_address'
  | 'pastor_name'
  | 'activity_group'
  | 'current_school'
  | 'current_school_year'
  | 'allergies'
  | 'next_of_kin_name'
>;

type Props = {
  values: StudentFieldValues;
  errors: Record<string, string>;
  onChange: (patch: Partial<StudentFieldValues>) => void;
};

function dateValue(iso: string): Dayjs | null {
  return iso ? dayjs(iso) : null;
}

export function StudentRegistrationFields({ values, errors, onChange }: Props) {
  return (
    <>
      <FormSection title="Personal details">
        <FormRow>
          <TextField
            label="Surname"
            value={values.last_name}
            onChange={(e) => onChange({ last_name: e.target.value })}
            error={Boolean(errors.last_name)}
            helperText={errors.last_name}
            required
            fullWidth
          />
          <TextField
            label="First name"
            value={values.first_name}
            onChange={(e) => onChange({ first_name: e.target.value })}
            error={Boolean(errors.first_name)}
            helperText={errors.first_name}
            required
            fullWidth
          />
        </FormRow>
        <FormRow>
          <TextField
            select
            label="Gender"
            value={values.gender}
            onChange={(e) => onChange({ gender: e.target.value })}
            error={Boolean(errors.gender)}
            helperText={errors.gender}
            required
            fullWidth
          >
            <MenuItem value="Male">Male</MenuItem>
            <MenuItem value="Female">Female</MenuItem>
          </TextField>
          <DatePicker
            label="Date of birth"
            value={dateValue(values.date_of_birth)}
            onChange={(v) => onChange({ date_of_birth: v ? v.format('YYYY-MM-DD') : '' })}
            maxDate={dayjs()}
            slotProps={{
              textField: {
                fullWidth: true,
                required: true,
                error: Boolean(errors.date_of_birth),
                helperText: errors.date_of_birth,
              },
            }}
          />
          <TextField
            select
            label="Nationality"
            value={values.nationality}
            onChange={(e) => onChange({ nationality: e.target.value })}
            error={Boolean(errors.nationality)}
            helperText={errors.nationality}
            required
            fullWidth
          >
            {NATIONALITIES.map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </TextField>
        </FormRow>
      </FormSection>

      <FormSection title="Contact">
        <TextField
          label="Address"
          value={values.address}
          onChange={(e) => onChange({ address: e.target.value })}
          error={Boolean(errors.address)}
          helperText={errors.address}
          required
          fullWidth
        />
        <FormRow>
          <UkPhoneTextField
            label="Child phone"
            fieldLabel="Child phone"
            value={values.phone}
            onChange={(phone) => onChange({ phone })}
            error={errors.phone}
            required
          />
          <EmailTextField
            label="Child email"
            fieldLabel="Child email"
            value={values.email}
            onChange={(email) => onChange({ email })}
            error={errors.email}
            required
          />
        </FormRow>
      </FormSection>

      <FormSection title="Faith">
        <FormControlLabel
          control={
            <Checkbox
              checked={values.born_again}
              onChange={(e) => onChange({ born_again: e.target.checked })}
            />
          }
          label="Born again?"
        />
        <FormRow>
          <DatePicker
            label="Date of new birth"
            value={dateValue(values.date_of_new_birth)}
            onChange={(v) => onChange({ date_of_new_birth: v ? v.format('YYYY-MM-DD') : '' })}
            maxDate={dayjs()}
            disabled={!values.born_again}
            slotProps={{ textField: { fullWidth: true } }}
          />
          <TextField
            label="New birth location"
            value={values.new_birth_location}
            onChange={(e) => onChange({ new_birth_location: e.target.value })}
            fullWidth
            disabled={!values.born_again}
          />
        </FormRow>
      </FormSection>

      <FormSection title="Church">
        <FormRow>
          <TextField
            label="Place of worship"
            value={values.place_of_worship}
            onChange={(e) => onChange({ place_of_worship: e.target.value })}
            error={Boolean(errors.place_of_worship)}
            helperText={errors.place_of_worship}
            required
            fullWidth
          />
          <TextField
            label="Worship address"
            value={values.place_of_worship_address}
            onChange={(e) => onChange({ place_of_worship_address: e.target.value })}
            error={Boolean(errors.place_of_worship_address)}
            helperText={errors.place_of_worship_address}
            required
            fullWidth
          />
        </FormRow>
        <FormRow>
          <TextField
            label="Name of pastor"
            value={values.pastor_name}
            onChange={(e) => onChange({ pastor_name: e.target.value })}
            error={Boolean(errors.pastor_name)}
            helperText={errors.pastor_name}
            required
            fullWidth
          />
          <TextField
            label="Activity group"
            value={values.activity_group}
            onChange={(e) => onChange({ activity_group: e.target.value })}
            error={Boolean(errors.activity_group)}
            helperText={errors.activity_group}
            required
            fullWidth
          />
        </FormRow>
      </FormSection>

      <FormSection title="School & emergency">
        <FormRow>
          <TextField
            label="Current school"
            value={values.current_school}
            onChange={(e) => onChange({ current_school: e.target.value })}
            error={Boolean(errors.current_school)}
            helperText={errors.current_school}
            required
            fullWidth
          />
          <TextField
            label="Current school year"
            value={values.current_school_year}
            onChange={(e) => onChange({ current_school_year: e.target.value })}
            error={Boolean(errors.current_school_year)}
            helperText={errors.current_school_year}
            required
            fullWidth
          />
        </FormRow>
        <FormRow>
          <TextField
            label="Allergies (optional)"
            value={values.allergies}
            onChange={(e) => onChange({ allergies: e.target.value })}
            fullWidth
          />
          <TextField
            label="Next of kin name"
            value={values.next_of_kin_name}
            onChange={(e) => onChange({ next_of_kin_name: e.target.value })}
            error={Boolean(errors.next_of_kin_name)}
            helperText={errors.next_of_kin_name}
            required
            fullWidth
          />
        </FormRow>
      </FormSection>
    </>
  );
}
