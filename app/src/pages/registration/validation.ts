import { emailError, normalizeEmail, normalizeUkPhone, ukPhoneError } from './contactValidation';
import type { ChildForm, GuardianInfo } from './types';

export function getAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth + 'T12:00:00');
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export function validateAdminGuardian(
  sessionId: number | '',
  data: Pick<GuardianInfo, 'guardian_name' | 'guardian_relationship' | 'guardian_phone'>,
): Record<string, string> {
  const g = normalizeGuardianContacts(data);
  const errors: Record<string, string> = {};
  if (sessionId === '') errors.session = 'Session is required';
  if (!g.guardian_name.trim()) errors.guardian_name = 'Parent or guardian name is required';
  if (!g.guardian_relationship.trim()) {
    errors.guardian_relationship = 'Relationship to child is required';
  }
  const guardianPhoneErr = ukPhoneError(g.guardian_phone, 'Parent / guardian phone');
  if (guardianPhoneErr) errors.guardian_phone = guardianPhoneErr;
  return errors;
}

export function validateGuardian(data: GuardianInfo): Record<string, string> {
  const g = normalizeGuardianContacts(data);
  const errors: Record<string, string> = {};
  if (!data.session_slug) errors.session_slug = 'Session is required';
  if (!g.guardian_name.trim()) errors.guardian_name = 'Parent or guardian name is required';
  if (!g.guardian_relationship.trim()) {
    errors.guardian_relationship = 'Relationship to child is required';
  }
  const guardianPhoneErr = ukPhoneError(g.guardian_phone, 'Parent / guardian phone');
  if (guardianPhoneErr) errors.guardian_phone = guardianPhoneErr;
  return errors;
}

/** Normalize contact fields before API submit. */
export function normalizeGuardianContacts<T extends Pick<GuardianInfo, 'guardian_phone'>>(data: T): T {
  return { ...data, guardian_phone: normalizeUkPhone(data.guardian_phone) };
}

export function normalizeChildContacts<T extends Pick<ChildForm, 'phone' | 'email'>>(child: T): T {
  return {
    ...child,
    phone: normalizeUkPhone(child.phone),
    email: normalizeEmail(child.email),
  };
}

export function validateChild(
  child: ChildForm,
  levels: { id: number; placement_group: string | null }[],
): Record<string, string> {
  const c = normalizeChildContacts(child);
  const errors: Record<string, string> = {};

  if (!c.jbs_level_id) errors.jbs_level_id = 'Course selection is required';
  if (!c.last_name.trim()) errors.last_name = 'Surname is required';
  if (!c.first_name.trim()) errors.first_name = 'First name is required';
  if (!c.gender) errors.gender = 'Gender is required';

  if (!c.date_of_birth) {
    errors.date_of_birth = 'Date of birth is required';
  } else {
    const dob = new Date(c.date_of_birth + 'T12:00:00');
    if (Number.isNaN(dob.getTime()) || dob >= new Date()) {
      errors.date_of_birth = 'Date of birth must be a valid past date';
    } else {
      const age = getAge(c.date_of_birth);
      if (age != null && age < 10) {
        errors.date_of_birth = 'Children must be at least 10 years old';
      }
      if (age != null && age < 13 && c.jbs_level_id) {
        const level = levels.find((l) => l.id === c.jbs_level_id);
        if (level?.placement_group && level.placement_group !== 'basic_10_12') {
          errors.jbs_level_id = 'Children under 13 can only register for Basic (10–12)';
        }
      }
    }
  }

  if (!c.nationality.trim()) errors.nationality = 'Nationality is required';
  if (!c.address.trim()) errors.address = 'Address is required';
  const phoneErr = ukPhoneError(c.phone, 'Phone number');
  if (phoneErr) errors.phone = phoneErr;
  const emailErr = emailError(c.email);
  if (emailErr) errors.email = emailErr;
  if (!c.place_of_worship.trim()) errors.place_of_worship = 'Place of worship is required';
  if (!c.place_of_worship_address.trim()) {
    errors.place_of_worship_address = 'Worship address is required';
  }
  if (!c.pastor_name.trim()) errors.pastor_name = "Pastor's name is required";
  if (!c.activity_group.trim()) errors.activity_group = 'Activity group is required';
  if (!c.current_school.trim()) errors.current_school = 'Current school is required';
  if (!c.current_school_year.trim()) errors.current_school_year = 'Current school year is required';
  if (!c.next_of_kin_name.trim()) errors.next_of_kin_name = 'Next of kin is required';

  return errors;
}
