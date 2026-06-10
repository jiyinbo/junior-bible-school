import { useState } from 'react';
import { TextField, type TextFieldProps } from '@mui/material';
import {
  UK_PHONE_HINT,
  emailError,
  normalizeEmail,
  normalizeUkPhone,
  stripPhoneFormatting,
  ukPhoneError,
} from './contactValidation';

type UkPhoneTextFieldProps = Omit<TextFieldProps, 'value' | 'onChange' | 'error' | 'helperText'> & {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  fieldLabel?: string;
};

export function UkPhoneTextField({
  value,
  onChange,
  error,
  helperText,
  fieldLabel = 'Phone number',
  label,
  required,
  ...rest
}: UkPhoneTextFieldProps) {
  const [touched, setTouched] = useState(false);
  const blurError = touched ? ukPhoneError(value, fieldLabel, Boolean(required)) : undefined;
  const displayError = error ?? blurError;

  return (
    <TextField
      {...rest}
      label={label}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      onChange={(e) => onChange(stripPhoneFormatting(e.target.value))}
      onBlur={(e) => {
        onChange(normalizeUkPhone(e.target.value));
        setTouched(true);
        rest.onBlur?.(e);
      }}
      error={Boolean(displayError)}
      helperText={displayError ?? helperText ?? UK_PHONE_HINT}
      required={required}
      fullWidth
    />
  );
}

type EmailTextFieldProps = Omit<TextFieldProps, 'value' | 'onChange' | 'error' | 'helperText'> & {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  fieldLabel?: string;
};

export function EmailTextField({
  value,
  onChange,
  error,
  helperText,
  fieldLabel = 'Email',
  label,
  required,
  ...rest
}: EmailTextFieldProps) {
  const [touched, setTouched] = useState(false);
  const blurError = touched ? emailError(value, fieldLabel, Boolean(required)) : undefined;
  const displayError = error ?? blurError;

  return (
    <TextField
      {...rest}
      label={label}
      type="email"
      inputMode="email"
      autoComplete="email"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => {
        onChange(normalizeEmail(e.target.value));
        setTouched(true);
        rest.onBlur?.(e);
      }}
      error={Boolean(displayError)}
      helperText={displayError ?? helperText}
      required={required}
      fullWidth
    />
  );
}
