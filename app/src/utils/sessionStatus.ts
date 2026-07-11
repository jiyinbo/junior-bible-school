import dayjs, { type Dayjs } from 'dayjs';
import type { SessionDateField } from './sessionDates';

export type SessionDatesInput = Record<SessionDateField, Dayjs | null>;

export type TestSummary = {
  status: string;
  question_count?: number;
} | null | undefined;

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

export function testQuestionCount(test: TestSummary): number {
  return test?.question_count ?? 0;
}

export function testHasQuestions(test: TestSummary): boolean {
  return testQuestionCount(test) > 0;
}

export function testNeedsSetup(test: TestSummary): boolean {
  return !test || (test.status === 'draft' && !testHasQuestions(test));
}

export function testIsSetUp(test: TestSummary): boolean {
  return !testNeedsSetup(test);
}

export function testLinkLabel(test: TestSummary): string {
  if (testNeedsSetup(test)) {
    return 'Set up test';
  }

  const count = testQuestionCount(test);

  switch (test.status) {
    case 'open':
      return 'Open';
    case 'closed':
      return 'Closed';
    case 'draft':
      return count === 1 ? '1 question' : `${count} questions`;
    default:
      return 'Set up test';
  }
}

export function testChipColor(
  test: TestSummary,
): 'default' | 'success' | 'warning' | 'info' {
  if (testNeedsSetup(test)) return 'warning';
  if (test.status === 'open') return 'success';
  if (test.status === 'closed') return 'default';
  return 'info';
}

export function testSetupSortOrder(test: TestSummary): number {
  if (testNeedsSetup(test)) return 0;
  if (test?.status === 'draft') return 1;
  if (test?.status === 'open') return 2;
  return 3;
}

export function sortModulesByTestSetup<T extends { test: TestSummary; name: string }>(
  modules: T[],
): T[] {
  return [...modules].sort((a, b) => {
    const orderDiff = testSetupSortOrder(a.test) - testSetupSortOrder(b.test);
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name);
  });
}

export function countTestsSetUp<T extends { test: TestSummary }>(modules: T[]): {
  ready: number;
  total: number;
} {
  return {
    ready: modules.filter((module) => testIsSetUp(module.test)).length,
    total: modules.length,
  };
}
