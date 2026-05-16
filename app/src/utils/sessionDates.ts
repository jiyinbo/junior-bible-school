import dayjs, { type Dayjs } from 'dayjs';

const END_OF_DAY_FIELDS = new Set(['registration_closes_at', 'session_ends_at']);

export type SessionDateField =
  | 'registration_opens_at'
  | 'registration_closes_at'
  | 'session_starts_at'
  | 'session_ends_at';

export function parseSessionDate(iso: string | null | undefined): Dayjs | null {
  if (!iso) return null;
  const d = dayjs(iso);
  return d.isValid() ? d : null;
}

export function sessionDateToApi(field: SessionDateField, value: Dayjs | null): string | null {
  if (!value?.isValid()) return null;
  if (END_OF_DAY_FIELDS.has(field)) {
    return value.endOf('day').format('YYYY-MM-DD HH:mm:ss');
  }
  return value.startOf('day').format('YYYY-MM-DD');
}
