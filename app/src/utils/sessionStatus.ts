import dayjs, { type Dayjs } from 'dayjs';
import type { SessionDateField } from './sessionDates';

export type SessionDatesInput = Record<SessionDateField, Dayjs | null>;

export function registrationStatusLabel(dates: SessionDatesInput, isPast: boolean): string {
  if (isPast) return 'Past session';
  const now = dayjs();
  if (dates.registration_opens_at && now.isBefore(dates.registration_opens_at, 'day')) {
    return 'Registration not open yet';
  }
  if (dates.registration_closes_at && now.isAfter(dates.registration_closes_at, 'day')) {
    return 'Registration closed';
  }
  if (!dates.registration_opens_at && !dates.registration_closes_at) {
    return 'Registration (no dates set)';
  }
  return 'Registration open';
}

export function programmeStatusLabel(dates: SessionDatesInput, isPast: boolean): string {
  if (isPast) return 'Session ended (marked past)';
  const now = dayjs();
  if (dates.session_starts_at && now.isBefore(dates.session_starts_at, 'day')) {
    return 'Session not started';
  }
  if (dates.session_ends_at && now.isAfter(dates.session_ends_at, 'day')) {
    return 'Session ended';
  }
  if (!dates.session_starts_at && !dates.session_ends_at) {
    return 'Session (no dates set)';
  }
  return 'Session in progress';
}

export function registrationChipColor(
  dates: SessionDatesInput,
  isPast: boolean,
): 'default' | 'success' | 'warning' {
  if (isPast) return 'default';
  const label = registrationStatusLabel(dates, isPast);
  if (label === 'Registration open') return 'success';
  if (label === 'Registration not open yet') return 'warning';
  return 'default';
}

export function programmeChipColor(
  dates: SessionDatesInput,
  isPast: boolean,
): 'default' | 'success' | 'warning' {
  if (isPast) return 'default';
  const label = programmeStatusLabel(dates, isPast);
  if (label === 'Session in progress') return 'success';
  if (label === 'Session not started') return 'warning';
  return 'default';
}

export function testChipColor(status: string | undefined): 'default' | 'success' | 'warning' {
  if (status === 'open') return 'success';
  if (status === 'closed') return 'warning';
  return 'default';
}

export function testActionLabel(status: string | undefined): string {
  switch (status) {
    case 'open':
      return 'Test open';
    case 'closed':
      return 'Test closed';
    case 'draft':
      return 'Draft test';
    default:
      return 'Set up test';
  }
}
