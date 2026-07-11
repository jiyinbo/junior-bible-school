import { useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { toastSuccess } from '../../feedback/toast';
import { apiJson, parseApiError } from '../../api/http';
import { EmailTextField, UkPhoneTextField } from '../registration/ContactFields';
import {
  GUARDIAN_RELATIONSHIPS,
  LABEL_GUARDIAN_FULL_NAME,
  LABEL_NEXT_OF_KIN_EMAIL,
  LABEL_NEXT_OF_KIN_FULL_NAME,
  LABEL_NEXT_OF_KIN_PHONE,
} from '../registration/constants';
import { NationalityField } from '../registration/NationalityField';
import { emptyToNull, patchStudent } from './studentPatch';
import type { StudentDetail, TierOption } from './studentDetailShared';

export type StudentEditSection =
  | 'registration'
  | 'contact'
  | 'guardian'
  | 'personal'
  | 'faith'
  | 'school'
  | 'nextOfKin'
  | 'portalPin';

function dateValue(iso: string | null | undefined): Dayjs | null {
  return iso ? dayjs(iso) : null;
}

function SectionEditDialog({
  open,
  title,
  onClose,
  onSave,
  saving,
  children,
  maxWidth = 'sm',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  children: ReactNode;
  maxWidth?: 'sm' | 'md';
}) {
  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth={maxWidth} fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {children}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void onSave()} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type Props = {
  section: StudentEditSection | null;
  student: StudentDetail;
  studentId: string;
  tiers: TierOption[];
  onClose: () => void;
  onSaved: (student: StudentDetail) => void;
  onError: (message: string) => void;
};

export function StudentSectionDialogs({
  section,
  student,
  studentId,
  tiers,
  onClose,
  onSaved,
  onError,
}: Props) {
  const [saving, setSaving] = useState(false);

  const [tierId, setTierId] = useState<number | ''>('');
  const [contact, setContact] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [guardian, setGuardian] = useState({
    guardian_name: '',
    guardian_relationship: '',
    guardian_phone: '',
    guardian_email: '',
  });
  const [personal, setPersonal] = useState({
    gender: '',
    date_of_birth: '',
    nationality: '',
    address: '',
  });
  const [faith, setFaith] = useState({
    born_again: false,
    date_of_new_birth: '',
    new_birth_location: '',
    place_of_worship: '',
    place_of_worship_address: '',
    pastor_name: '',
    activity_group: '',
  });
  const [school, setSchool] = useState({
    current_school: '',
    current_school_year: '',
    has_allergies: false,
    allergies: '',
  });
  const [nextOfKin, setNextOfKin] = useState({
    next_of_kin_name: '',
    next_of_kin_phone: '',
    next_of_kin_email: '',
  });
  const [resetPinValue, setResetPinValue] = useState('');
  const [resetPinResult, setResetPinResult] = useState<string | null>(null);

  useEffect(() => {
    if (!section) return;

    setResetPinResult(null);
    setResetPinValue('');

    if (section === 'registration') {
      setTierId(student.level.id);
    }
    if (section === 'contact') {
      setContact({
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email ?? '',
        phone: student.phone ?? '',
      });
    }
    if (section === 'guardian') {
      setGuardian({
        guardian_name: student.guardian_name ?? '',
        guardian_relationship: student.guardian_relationship ?? '',
        guardian_phone: student.guardian_phone ?? '',
        guardian_email: student.guardian_email ?? '',
      });
    }
    if (section === 'personal') {
      setPersonal({
        gender: student.gender ?? '',
        date_of_birth: student.date_of_birth ?? '',
        nationality: student.nationality ?? '',
        address: student.address ?? '',
      });
    }
    if (section === 'faith') {
      setFaith({
        born_again: student.born_again ?? false,
        date_of_new_birth: student.date_of_new_birth ?? '',
        new_birth_location: student.new_birth_location ?? '',
        place_of_worship: student.place_of_worship ?? '',
        place_of_worship_address: student.place_of_worship_address ?? '',
        pastor_name: student.pastor_name ?? '',
        activity_group: student.activity_group ?? '',
      });
    }
    if (section === 'school') {
      setSchool({
        current_school: student.current_school ?? '',
        current_school_year: student.current_school_year ?? '',
        has_allergies: Boolean(student.allergies?.trim()),
        allergies: student.allergies ?? '',
      });
    }
    if (section === 'nextOfKin') {
      setNextOfKin({
        next_of_kin_name: student.next_of_kin_name ?? '',
        next_of_kin_phone: student.next_of_kin_phone ?? '',
        next_of_kin_email: student.next_of_kin_email ?? '',
      });
    }
  }, [section, student]);

  const saveProfile = async (payload: Record<string, unknown>, successMessage: string) => {
    setSaving(true);
    onError('');
    try {
      const updated = await patchStudent(studentId, payload);
      toastSuccess(successMessage);
      onSaved(updated);
      onClose();
    } catch (e) {
      onError(parseApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const resetPortalPin = async (sendEmail: boolean) => {
    setSaving(true);
    onError('');
    setResetPinResult(null);
    try {
      const response = await apiJson<{ data: { pin: string }; message: string }>(
        `/api/v1/admin/registrations/${studentId}/pin`,
        {
          method: 'PATCH',
          json: {
            ...(resetPinValue.trim().length === 4 ? { pin: resetPinValue.trim() } : {}),
            send_email: sendEmail,
          },
        },
      );
      setResetPinValue('');
      setResetPinResult(response.data.pin);
      toastSuccess(sendEmail ? 'Portal PIN reset and emailed.' : 'Portal PIN reset.');
      if (!sendEmail) {
        onClose();
      }
    } catch (e) {
      onError(parseApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionEditDialog
        open={section === 'registration'}
        title="Edit registration"
        onClose={onClose}
        saving={saving}
        onSave={() => {
          if (tierId === '' || tierId === student.level.id) {
            onClose();
            return;
          }
          void saveProfile({ jbs_level_id: tierId }, 'Tier updated. A new registration number and portal PIN were emailed.');
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Registration number: <strong>{student.registration_number}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Session: {student.session.name}
        </Typography>
        <TextField
          select
          label="Tier"
          value={tierId}
          onChange={(e) => setTierId(e.target.value === '' ? '' : Number(e.target.value))}
          helperText="Moving tier issues a new registration number and portal PIN, then emails the student and guardian."
          disabled={tiers.length === 0}
          fullWidth
        >
          {tiers.map((tier) => (
            <MenuItem key={tier.id} value={tier.id}>
              {tier.name}
            </MenuItem>
          ))}
        </TextField>
      </SectionEditDialog>

      <SectionEditDialog
        open={section === 'contact'}
        title="Edit contact"
        onClose={onClose}
        saving={saving}
        onSave={() =>
          void saveProfile(
            {
              first_name: contact.first_name.trim(),
              last_name: contact.last_name.trim(),
              email: emptyToNull(contact.email),
              phone: emptyToNull(contact.phone),
            },
            'Contact details saved.',
          )
        }
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="First name"
            value={contact.first_name}
            onChange={(e) => setContact((current) => ({ ...current, first_name: e.target.value }))}
            fullWidth
            required
          />
          <TextField
            label="Last name"
            value={contact.last_name}
            onChange={(e) => setContact((current) => ({ ...current, last_name: e.target.value }))}
            fullWidth
            required
          />
        </Stack>
        <EmailTextField
          label="Email"
          fieldLabel="Email"
          value={contact.email}
          onChange={(email) => setContact((current) => ({ ...current, email }))}
          helperText="Leave blank if not available"
        />
        <UkPhoneTextField
          label="Phone"
          fieldLabel="Phone"
          value={contact.phone}
          onChange={(phone) => setContact((current) => ({ ...current, phone }))}
          helperText="Leave blank if not available"
        />
      </SectionEditDialog>

      <SectionEditDialog
        open={section === 'guardian'}
        title="Edit guardian"
        onClose={onClose}
        saving={saving}
        onSave={() =>
          void saveProfile(
            {
              guardian_name: emptyToNull(guardian.guardian_name),
              guardian_relationship: emptyToNull(guardian.guardian_relationship),
              guardian_phone: emptyToNull(guardian.guardian_phone),
              guardian_email: emptyToNull(guardian.guardian_email),
            },
            'Guardian details saved.',
          )
        }
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label={LABEL_GUARDIAN_FULL_NAME}
            value={guardian.guardian_name}
            onChange={(e) => setGuardian((current) => ({ ...current, guardian_name: e.target.value }))}
            fullWidth
          />
          <TextField
            select
            label="Relationship to child"
            value={guardian.guardian_relationship}
            onChange={(e) => setGuardian((current) => ({ ...current, guardian_relationship: e.target.value }))}
            fullWidth
          >
            {GUARDIAN_RELATIONSHIPS.map((relationship) => (
              <MenuItem key={relationship} value={relationship}>
                {relationship}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <EmailTextField
          label="Parent / guardian email"
          fieldLabel="Parent / guardian email"
          value={guardian.guardian_email}
          onChange={(guardian_email) => setGuardian((current) => ({ ...current, guardian_email }))}
        />
        <UkPhoneTextField
          label="Parent / guardian phone"
          fieldLabel="Parent / guardian phone"
          value={guardian.guardian_phone}
          onChange={(guardian_phone) => setGuardian((current) => ({ ...current, guardian_phone }))}
        />
      </SectionEditDialog>

      <SectionEditDialog
        open={section === 'personal'}
        title="Edit personal details"
        onClose={onClose}
        saving={saving}
        onSave={() =>
          void saveProfile(
            {
              gender: emptyToNull(personal.gender),
              date_of_birth: personal.date_of_birth || null,
              nationality: emptyToNull(personal.nationality),
              address: emptyToNull(personal.address),
            },
            'Personal details saved.',
          )
        }
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            label="Gender"
            value={personal.gender}
            onChange={(e) => setPersonal((current) => ({ ...current, gender: e.target.value }))}
            fullWidth
          >
            <MenuItem value="Male">Male</MenuItem>
            <MenuItem value="Female">Female</MenuItem>
          </TextField>
          <DatePicker
            label="Date of birth"
            value={dateValue(personal.date_of_birth)}
            onChange={(value) =>
              setPersonal((current) => ({
                ...current,
                date_of_birth: value ? value.format('YYYY-MM-DD') : '',
              }))
            }
            maxDate={dayjs()}
            format="DD/MM/YYYY"
            slotProps={{
              textField: { fullWidth: true, placeholder: 'DD/MM/YYYY' },
            }}
          />
        </Stack>
        <NationalityField
          value={personal.nationality}
          onChange={(nationality) => setPersonal((current) => ({ ...current, nationality }))}
          required
        />
        <TextField
          label="Address"
          value={personal.address}
          onChange={(e) => setPersonal((current) => ({ ...current, address: e.target.value }))}
          fullWidth
          multiline
          minRows={2}
        />
      </SectionEditDialog>

      <SectionEditDialog
        open={section === 'faith'}
        title="Edit faith & church"
        onClose={onClose}
        saving={saving}
        maxWidth="md"
        onSave={() =>
          void saveProfile(
            {
              born_again: faith.born_again,
              date_of_new_birth: faith.born_again ? faith.date_of_new_birth || null : null,
              new_birth_location: faith.born_again ? emptyToNull(faith.new_birth_location) : null,
              place_of_worship: emptyToNull(faith.place_of_worship),
              place_of_worship_address: emptyToNull(faith.place_of_worship_address),
              pastor_name: emptyToNull(faith.pastor_name),
              activity_group: emptyToNull(faith.activity_group),
            },
            'Faith & church details saved.',
          )
        }
      >
        <FormControlLabel
          control={
            <Checkbox
              checked={faith.born_again}
              onChange={(e) => setFaith((current) => ({ ...current, born_again: e.target.checked }))}
            />
          }
          label="Born again?"
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <DatePicker
            label="Date of new birth"
            value={dateValue(faith.date_of_new_birth)}
            onChange={(value) =>
              setFaith((current) => ({
                ...current,
                date_of_new_birth: value ? value.format('YYYY-MM-DD') : '',
              }))
            }
            maxDate={dayjs()}
            format="DD/MM/YYYY"
            disabled={!faith.born_again}
            slotProps={{
              textField: { fullWidth: true, placeholder: 'DD/MM/YYYY' },
            }}
          />
          <TextField
            label="New birth location"
            value={faith.new_birth_location}
            onChange={(e) => setFaith((current) => ({ ...current, new_birth_location: e.target.value }))}
            fullWidth
            disabled={!faith.born_again}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Place of worship"
            value={faith.place_of_worship}
            onChange={(e) => setFaith((current) => ({ ...current, place_of_worship: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Worship address"
            value={faith.place_of_worship_address}
            onChange={(e) =>
              setFaith((current) => ({ ...current, place_of_worship_address: e.target.value }))
            }
            fullWidth
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Name of pastor"
            value={faith.pastor_name}
            onChange={(e) => setFaith((current) => ({ ...current, pastor_name: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Activity group"
            value={faith.activity_group}
            onChange={(e) => setFaith((current) => ({ ...current, activity_group: e.target.value }))}
            fullWidth
          />
        </Stack>
      </SectionEditDialog>

      <SectionEditDialog
        open={section === 'school'}
        title="Edit school & medical"
        onClose={onClose}
        saving={saving}
        onSave={() =>
          void saveProfile(
            {
              current_school: emptyToNull(school.current_school),
              current_school_year: emptyToNull(school.current_school_year),
              allergies: school.has_allergies ? emptyToNull(school.allergies) : null,
            },
            'School & medical details saved.',
          )
        }
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Current school"
            value={school.current_school}
            onChange={(e) => setSchool((current) => ({ ...current, current_school: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Current school year"
            value={school.current_school_year}
            onChange={(e) => setSchool((current) => ({ ...current, current_school_year: e.target.value }))}
            fullWidth
          />
        </Stack>
        <FormControl fullWidth>
          <FormLabel id="staff-has-allergies-label">Any allergies or medical conditions?</FormLabel>
          <RadioGroup
            row
            aria-labelledby="staff-has-allergies-label"
            value={school.has_allergies ? 'yes' : 'no'}
            onChange={(e) => {
              const yes = e.target.value === 'yes';
              setSchool((current) => ({
                ...current,
                has_allergies: yes,
                allergies: yes ? current.allergies : '',
              }));
            }}
          >
            <FormControlLabel value="no" control={<Radio />} label="No" />
            <FormControlLabel value="yes" control={<Radio />} label="Yes" />
          </RadioGroup>
        </FormControl>
        {school.has_allergies ? (
          <TextField
            label="Please describe the allergy or medical condition"
            value={school.allergies}
            onChange={(e) => setSchool((current) => ({ ...current, allergies: e.target.value }))}
            fullWidth
            multiline
            minRows={2}
            required
          />
        ) : null}
      </SectionEditDialog>

      <SectionEditDialog
        open={section === 'nextOfKin'}
        title="Edit next of kin"
        onClose={onClose}
        saving={saving}
        onSave={() =>
          void saveProfile(
            {
              next_of_kin_name: emptyToNull(nextOfKin.next_of_kin_name),
              next_of_kin_phone: emptyToNull(nextOfKin.next_of_kin_phone),
              next_of_kin_email: emptyToNull(nextOfKin.next_of_kin_email),
            },
            'Next of kin details saved.',
          )
        }
      >
        <TextField
          label={LABEL_NEXT_OF_KIN_FULL_NAME}
          value={nextOfKin.next_of_kin_name}
          onChange={(e) => setNextOfKin((current) => ({ ...current, next_of_kin_name: e.target.value }))}
          fullWidth
        />
        <UkPhoneTextField
          label={LABEL_NEXT_OF_KIN_PHONE}
          fieldLabel="Next of kin phone"
          value={nextOfKin.next_of_kin_phone}
          onChange={(next_of_kin_phone) => setNextOfKin((current) => ({ ...current, next_of_kin_phone }))}
        />
        <EmailTextField
          label={LABEL_NEXT_OF_KIN_EMAIL}
          fieldLabel="Next of kin email"
          value={nextOfKin.next_of_kin_email}
          onChange={(next_of_kin_email) => setNextOfKin((current) => ({ ...current, next_of_kin_email }))}
        />
      </SectionEditDialog>

      <Dialog open={section === 'portalPin'} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Reset student portal PIN</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Reset the student&apos;s 4-digit portal PIN if they cannot sign in. Leave blank to generate a random PIN.
            </Typography>
            <TextField
              label="Set specific PIN (optional)"
              value={resetPinValue}
              onChange={(e) => setResetPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              helperText="4 digits, or leave blank for a random PIN"
              fullWidth
            />
            {resetPinResult && (
              <Alert severity="info">
                New PIN:{' '}
                <strong style={{ fontFamily: 'monospace', letterSpacing: '0.15em' }}>{resetPinResult}</strong>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={saving}>
            {resetPinResult ? 'Close' : 'Cancel'}
          </Button>
          <Button variant="outlined" disabled={saving} onClick={() => void resetPortalPin(false)}>
            Reset only
          </Button>
          <Button variant="contained" disabled={saving} onClick={() => void resetPortalPin(true)}>
            Reset &amp; email PIN
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
