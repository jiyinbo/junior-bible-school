export type SessionOption = {
  id: number;
  name: string;
  slug: string;
  registration_is_open?: boolean;
};

export type LevelOption = {
  id: number;
  name: string;
  placement_group: string | null;
  registration_prefix: string;
};

export type GuardianInfo = {
  session_slug: string;
  guardian_name: string;
  guardian_relationship: string;
  guardian_phone: string;
  guardian_email: string;
};

export type ChildForm = {
  jbs_level_id: number | '';
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  nationality: string;
  address: string;
  phone: string;
  email: string;
  born_again: boolean;
  date_of_new_birth: string;
  new_birth_location: string;
  place_of_worship: string;
  place_of_worship_address: string;
  pastor_name: string;
  activity_group: string;
  current_school: string;
  current_school_year: string;
  allergies: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
  next_of_kin_email: string;
};

export type RegistrationPayload = GuardianInfo & {
  children: Omit<ChildForm, 'jbs_level_id'> & { jbs_level_id: number }[];
};

export type EnrolledParticipant = {
  registration_number: string;
  participant_name: string;
  session_name: string;
  level_name: string;
};

export const emptyChild = (levelId: number | '' = ''): ChildForm => ({
  jbs_level_id: levelId,
  first_name: '',
  last_name: '',
  gender: '',
  date_of_birth: '',
  nationality: '',
  address: '',
  phone: '',
  email: '',
  born_again: false,
  date_of_new_birth: '',
  new_birth_location: '',
  place_of_worship: '',
  place_of_worship_address: '',
  pastor_name: '',
  activity_group: '',
  current_school: '',
  current_school_year: '',
  allergies: '',
  next_of_kin_name: '',
  next_of_kin_phone: '',
  next_of_kin_email: '',
});
