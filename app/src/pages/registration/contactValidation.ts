/** UK mobile/landline: 11 digits including leading 0 (e.g. 07123456789). */
export const UK_PHONE_PATTERN = /^0\d{10}$/;

/** Practical email check aligned with backend `email` rule. */
export const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const UK_PHONE_HINT = 'UK number: 11 digits starting with 0 (e.g. 07123456789)';

/** Strip spaces, dashes, and brackets while typing. */
export function stripPhoneFormatting(raw: string): string {
  return raw.replace(/[\s\-().]/g, '');
}

/**
 * Normalize to 11-digit UK format (0…).
 * Accepts +44 / 0044 prefixes and removes other non-digits.
 */
export function normalizeUkPhone(raw: string): string {
  let s = stripPhoneFormatting(raw.trim());
  if (s.startsWith('+44')) {
    s = `0${s.slice(3)}`;
  } else if (s.startsWith('0044')) {
    s = `0${s.slice(4)}`;
  }
  return s.replace(/\D/g, '');
}

export function isValidUkPhone(value: string): boolean {
  return UK_PHONE_PATTERN.test(normalizeUkPhone(value));
}

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 255 && EMAIL_PATTERN.test(trimmed);
}

export function ukPhoneError(
  value: string,
  label = 'Phone number',
  required = true,
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return required ? `${label} is required` : undefined;
  const normalized = normalizeUkPhone(trimmed);
  if (!UK_PHONE_PATTERN.test(normalized)) {
    return `${label} must be a valid UK number (11 digits starting with 0)`;
  }
  return undefined;
}

export function emailError(value: string, label = 'Email', required = true): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return required ? `${label} is required` : undefined;
  if (trimmed.length > 255) return `${label} must be 255 characters or fewer`;
  if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address';
  return undefined;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
