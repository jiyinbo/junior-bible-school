import { Autocomplete, TextField } from '@mui/material';
import { NATIONALITIES } from './constants';

type Props = {
  value: string;
  onChange: (nationality: string) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
};

function nationalityOptions(value: string): readonly string[] {
  if (value && !(NATIONALITIES as readonly string[]).includes(value)) {
    return [value, ...NATIONALITIES];
  }

  return NATIONALITIES;
}

export function NationalityField({
  value,
  onChange,
  error,
  helperText,
  required,
  fullWidth = true,
}: Props) {
  return (
    <Autocomplete
      options={nationalityOptions(value)}
      value={value || null}
      onChange={(_, option) => onChange(option ?? '')}
      getOptionLabel={(option) => option}
      isOptionEqualToValue={(a, b) => a === b}
      fullWidth={fullWidth}
      autoHighlight
      openOnFocus
      disableClearable={required}
      noOptionsText="No matching nationality"
      renderInput={(params) => (
        <TextField
          {...params}
          label="Nationality"
          required={required}
          error={error}
          helperText={helperText}
          placeholder="Type to search…"
        />
      )}
    />
  );
}
