import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../../api/http';
import type { StudentProgressData } from '../../components/StudentProgressPanel';

export type StudentDetail = {
  id: number;
  registration_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  guardian_name: string | null;
  guardian_relationship: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  gender: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  address: string | null;
  born_again: boolean | null;
  date_of_new_birth: string | null;
  new_birth_location: string | null;
  place_of_worship: string | null;
  place_of_worship_address: string | null;
  pastor_name: string | null;
  activity_group: string | null;
  current_school: string | null;
  current_school_year: string | null;
  allergies: string | null;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  next_of_kin_email: string | null;
  session: { id: number; name: string };
  level: { id: number; name: string };
  progress: StudentProgressData;
  level_completed_by: { name: string } | null;
};

export type TierOption = { id: number; name: string };

export function formatStudentField(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '—';
}

export function formatStudentBool(value: boolean | null | undefined): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return '—';
}

/** Matches staff list + StudentProgressPanel tier summary (and student portal progress strip). */
export function studentTierStatusDisplay(
  levelCompleted: boolean,
  programmePhase?: string | null,
): { label: string; color: 'default' | 'success' } {
  if (levelCompleted) {
    return { label: 'Completed', color: 'success' };
  }
  if (programmePhase === 'upcoming') {
    return { label: 'Not started', color: 'default' };
  }
  return { label: 'In progress', color: 'default' };
}

export function useStudentDetail(studentId: string | undefined) {
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!studentId) return;
    apiJson<{ data: StudentDetail }>(`/api/v1/admin/registrations/${studentId}`)
      .then((r) => {
        setStudent(r.data);
        setError(null);
      })
      .catch(() => setError('Could not load student.'));
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  return { student, setStudent, error, setError, load };
}
