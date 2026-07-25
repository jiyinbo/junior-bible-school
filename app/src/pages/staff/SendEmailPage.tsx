import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  createFilterOptions,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import { apiFormDataJson, apiJson, parseApiError } from '../../api/http';
import { PageHeader } from '../../staff/PageHeader';
import { toastSuccess } from '../../feedback/toast';

type AudienceKey =
  | 'parent_one'
  | 'student_one'
  | 'parents_tier'
  | 'parents_session'
  | 'staff_teachers'
  | 'staff_admins'
  | 'staff_assistants'
  | 'staff_all';

type AudienceOption = { key: AudienceKey; label: string };
type SessionOption = { id: number; name: string };
type LevelOption = { id: number; jbs_session_id: number; name: string };
type RegistrationOption = {
  id: number;
  registration_number: string;
  full_name: string;
  email: string | null;
  has_student_email: boolean;
  guardian_name: string | null;
  guardian_email: string | null;
  has_guardian_email: boolean;
  level_name: string | null;
};
type Recipient = { email: string; name: string; label: string };

const PARENT_AUDIENCES: AudienceKey[] = ['parent_one', 'parents_tier', 'parents_session'];
const STUDENT_SELECT_AUDIENCES: AudienceKey[] = ['parent_one', 'student_one'];
const SESSION_AUDIENCES: AudienceKey[] = [...PARENT_AUDIENCES, 'student_one'];
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const filterRegistrations = createFilterOptions<RegistrationOption>({
  stringify: (option) =>
    `${option.full_name} ${option.registration_number} ${option.email ?? ''} ${option.guardian_email ?? ''} ${option.level_name ?? ''}`,
});

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function studentOptionLabel(option: RegistrationOption, mode: 'parent' | 'student'): string {
  const email =
    mode === 'parent'
      ? option.guardian_email
        ? ` — ${option.guardian_email}`
        : ' — no guardian email'
      : option.email
        ? ` — ${option.email}`
        : ' — no student email';
  const tier = option.level_name ? ` · ${option.level_name}` : '';
  return `${option.full_name} (${option.registration_number})${tier}${email}`;
}

export function SendEmailPage() {
  const [audiences, setAudiences] = useState<AudienceOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [levels, setLevels] = useState<LevelOption[]>([]);
  const [audience, setAudience] = useState<AudienceKey | ''>('');
  const [sessionId, setSessionId] = useState<number | ''>('');
  const [levelId, setLevelId] = useState<number | ''>('');
  const [selectedRegistrations, setSelectedRegistrations] = useState<RegistrationOption[]>([]);
  const [registrationOptions, setRegistrationOptions] = useState<RegistrationOption[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [lastResult, setLastResult] = useState<{
    sent: number;
    failed: number;
    failures: { email: string; error: string }[];
  } | null>(null);

  useEffect(() => {
    apiJson<{
      data: {
        audiences: AudienceOption[];
        sessions: SessionOption[];
        levels: LevelOption[];
      };
    }>('/api/v1/admin/mail/options')
      .then((r) => {
        setAudiences(r.data.audiences);
        setSessions(r.data.sessions);
        setLevels(r.data.levels);
      })
      .catch(() => setError('Could not load mail options.'))
      .finally(() => setLoadingOptions(false));
  }, []);

  const levelsForSession = useMemo(
    () => (sessionId === '' ? [] : levels.filter((l) => l.jbs_session_id === sessionId)),
    [levels, sessionId],
  );

  const needsSession = audience !== '' && SESSION_AUDIENCES.includes(audience);
  const needsTier = audience === 'parents_tier';
  const needsRegistration = audience !== '' && STUDENT_SELECT_AUDIENCES.includes(audience);
  const selectionMode: 'parent' | 'student' = audience === 'student_one' ? 'student' : 'parent';
  const showOptionalTier = needsRegistration && sessionId !== '';

  const loadRegistrations = useCallback(async () => {
    if (!needsRegistration || sessionId === '') {
      setRegistrationOptions([]);
      setSelectedRegistrations([]);
      return;
    }
    setLoadingRegistrations(true);
    try {
      const params = new URLSearchParams({ jbs_session_id: String(sessionId) });
      if (levelId !== '') {
        params.set('jbs_level_id', String(levelId));
      }
      const r = await apiJson<{ data: RegistrationOption[] }>(
        `/api/v1/admin/mail/registration-options?${params}`,
      );
      setRegistrationOptions(r.data);
      setSelectedRegistrations((prev) => prev.filter((row) => r.data.some((opt) => opt.id === row.id)));
    } catch {
      setRegistrationOptions([]);
      setSelectedRegistrations([]);
      setError('Could not load students for this session.');
    } finally {
      setLoadingRegistrations(false);
    }
  }, [needsRegistration, sessionId, levelId]);

  useEffect(() => {
    void loadRegistrations();
  }, [loadRegistrations]);

  const payload = useMemo(() => {
    const data: Record<string, unknown> = { audience };
    if (sessionId !== '') data.jbs_session_id = sessionId;
    if (levelId !== '') data.jbs_level_id = levelId;
    if (needsRegistration) {
      data.registration_ids = selectedRegistrations.map((r) => r.id);
    }
    return data;
  }, [audience, sessionId, levelId, needsRegistration, selectedRegistrations]);

  const canPreview =
    audience !== '' &&
    (!needsSession || sessionId !== '') &&
    (!needsTier || levelId !== '') &&
    (!needsRegistration || selectedRegistrations.length > 0);

  const previewRecipients = async () => {
    if (!canPreview) return;
    setPreviewing(true);
    setError(null);
    setLastResult(null);
    try {
      const r = await apiJson<{ data: { count: number; recipients: Recipient[] } }>(
        '/api/v1/admin/mail/recipients',
        { method: 'POST', json: payload },
      );
      setRecipients(r.data.recipients);
      setRecipientCount(r.data.count);
    } catch (e) {
      setRecipients([]);
      setRecipientCount(null);
      setError(parseApiError(e));
    } finally {
      setPreviewing(false);
    }
  };

  const openSendDialog = () => {
    if (!subject.trim() || !body.trim()) {
      setError('Subject and message are required.');
      return;
    }
    if (recipientCount === null || recipientCount === 0) {
      setError('Preview recipients first — there must be at least one valid email address.');
      return;
    }
    setConfirm(false);
    setSendDialogOpen(true);
  };

  const addAttachments = (files: FileList | null) => {
    if (!files?.length) return;
    const next = [...attachments];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_ATTACHMENTS) {
        errors.push(`You can attach up to ${MAX_ATTACHMENTS} files.`);
        break;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        errors.push(`${file.name} is too large (max 10 MB).`);
        continue;
      }
      if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
        errors.push(`${file.name} is not an allowed file type.`);
        continue;
      }
      next.push(file);
    }
    setAttachments(next);
    if (errors.length) setError(errors[0]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const buildSendFormData = (): FormData => {
    const fd = new FormData();
    fd.append('audience', audience);
    if (sessionId !== '') fd.append('jbs_session_id', String(sessionId));
    if (levelId !== '') fd.append('jbs_level_id', String(levelId));
    for (const reg of selectedRegistrations) {
      fd.append('registration_ids[]', String(reg.id));
    }
    fd.append('subject', subject.trim());
    fd.append('body', body.trim());
    fd.append('confirm', '1');
    for (const file of attachments) {
      fd.append('attachments[]', file);
    }
    return fd;
  };

  const sendMail = async () => {
    setSending(true);
    setError(null);
    try {
      const r = await apiFormDataJson<{
        data: {
          sent: number;
          failed: number;
          failures: { email: string; error: string }[];
        };
      }>('/api/v1/admin/mail/send', buildSendFormData());
      setLastResult(r.data);
      setSendDialogOpen(false);
      setAttachments([]);
      if (r.data.sent > 0) {
        toastSuccess(`Sent ${r.data.sent} email${r.data.sent === 1 ? '' : 's'}.`);
      }
    } catch (e) {
      setError(parseApiError(e));
      setSendDialogOpen(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Send email"
        subtitle="Send a message to parents / guardians, students with email on file, or staff."
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2, maxWidth: 900 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {lastResult && (
        <Alert
          severity={lastResult.failed > 0 ? 'warning' : 'success'}
          sx={{ mb: 2, maxWidth: 900 }}
          onClose={() => setLastResult(null)}
        >
          Sent {lastResult.sent} email{lastResult.sent === 1 ? '' : 's'}.
          {lastResult.failed > 0 && ` ${lastResult.failed} failed.`}
        </Alert>
      )}

      <Paper sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900 }}>
        <Stack spacing={2.5}>
          <TextField
            select
            label="Recipients"
            value={audience}
            onChange={(e) => {
              setAudience(e.target.value as AudienceKey);
              setRecipients([]);
              setRecipientCount(null);
              setSelectedRegistrations([]);
              setLevelId('');
            }}
            required
            fullWidth
            disabled={loadingOptions}
            helperText={
              audience === 'student_one'
                ? 'Only students with their own email on file can be selected.'
                : 'Parents are contacted using the parent / guardian email from each registration.'
            }
          >
            <MenuItem value="" disabled>
              Select recipient group
            </MenuItem>
            {audiences.map((a) => (
              <MenuItem key={a.key} value={a.key}>
                {a.label}
              </MenuItem>
            ))}
          </TextField>

          {needsSession && (
            <TextField
              select
              label="Session"
              value={sessionId}
              onChange={(e) => {
                setSessionId(e.target.value === '' ? '' : Number(e.target.value));
                setLevelId('');
                setSelectedRegistrations([]);
                setRecipients([]);
                setRecipientCount(null);
              }}
              required
              fullWidth
            >
              <MenuItem value="" disabled>
                Select session
              </MenuItem>
              {sessions.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          {(needsTier || showOptionalTier) && sessionId !== '' && (
            <TextField
              select
              label="Tier"
              value={levelId}
              onChange={(e) => {
                setLevelId(e.target.value === '' ? '' : Number(e.target.value));
                setSelectedRegistrations([]);
                setRecipients([]);
                setRecipientCount(null);
              }}
              required={needsTier}
              fullWidth
              helperText={
                showOptionalTier && !needsTier
                  ? 'Optional — narrow the student list by tier'
                  : undefined
              }
            >
              <MenuItem value="" disabled={needsTier}>
                {needsTier ? 'Select tier' : 'All tiers'}
              </MenuItem>
              {levelsForSession.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          {needsRegistration && sessionId !== '' && (
            <Autocomplete
              multiple
              options={registrationOptions}
              value={selectedRegistrations}
              onChange={(_, value) => {
                setSelectedRegistrations(value);
                setRecipients([]);
                setRecipientCount(null);
              }}
              filterOptions={filterRegistrations}
              getOptionLabel={(option) => studentOptionLabel(option, selectionMode)}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              getOptionDisabled={(option) =>
                selectionMode === 'parent' ? !option.has_guardian_email : !option.has_student_email
              }
              disabled={loadingRegistrations}
              fullWidth
              autoHighlight
              openOnFocus
              disableCloseOnSelect
              noOptionsText={
                loadingRegistrations ? 'Loading students…' : 'No students found for this selection'
              }
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return (
                    <Chip
                      key={key}
                      size="small"
                      label={`${option.full_name} (${option.registration_number})`}
                      {...tagProps}
                    />
                  );
                })
              }
              renderOption={(props, option) => {
                const { key, ...optionProps } = props as typeof props & { key?: string };
                const email =
                  selectionMode === 'parent'
                    ? (option.guardian_email ?? 'No guardian email')
                    : (option.email ?? 'No student email');
                return (
                  <li key={key ?? option.id} {...optionProps}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', py: 0.25 }}>
                      <Typography variant="body2">
                        {option.full_name} ({option.registration_number})
                        {option.level_name ? ` · ${option.level_name}` : ''}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {email}
                      </Typography>
                    </Box>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Students"
                  required
                  placeholder={
                    selectedRegistrations.length === 0 ? 'Search and select one or more students' : ''
                  }
                  helperText={
                    loadingRegistrations
                      ? 'Loading students…'
                      : selectionMode === 'parent'
                        ? 'Select one or more students — email goes to each parent / guardian on file'
                        : 'Select one or more students — email goes to each student address on file'
                  }
                />
              )}
            />
          )}

          <TextField
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            fullWidth
            inputProps={{ maxLength: 200 }}
          />

          <TextField
            label="Message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            fullWidth
            multiline
            minRows={8}
            helperText="Plain text; line breaks are preserved in the email."
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Attachments (optional)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Up to {MAX_ATTACHMENTS} files, 10 MB each — PDF, Word, Excel, or images.
            </Typography>
            <Button
              component="label"
              variant="outlined"
              startIcon={<AttachFileIcon />}
              disabled={attachments.length >= MAX_ATTACHMENTS}
            >
              Add files
              <input
                type="file"
                hidden
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                onChange={(e) => {
                  addAttachments(e.target.files);
                  e.target.value = '';
                }}
              />
            </Button>
            {attachments.length > 0 && (
              <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                {attachments.map((file, index) => (
                  <Box
                    key={`${file.name}-${file.size}-${index}`}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      typography: 'body2',
                    }}
                  >
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {file.name} ({formatFileSize(file.size)})
                    </Typography>
                    <IconButton
                      size="small"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => removeAttachment(index)}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <Button
              type="button"
              variant="outlined"
              onClick={() => void previewRecipients()}
              disabled={!canPreview || previewing}
            >
              {previewing ? 'Loading…' : 'Preview recipients'}
            </Button>
            <Button
              type="button"
              variant="contained"
              onClick={openSendDialog}
              disabled={!canPreview || previewing || sending}
            >
              Send email
            </Button>
          </Box>

          {recipientCount !== null && (
            <Typography variant="body2" color="text.secondary">
              {recipientCount === 0
                ? 'No valid email addresses found for this selection.'
                : `${recipientCount} recipient${recipientCount === 1 ? '' : 's'}${
                    audience === 'parent_one' || audience === 'parents_tier' || audience === 'parents_session'
                      ? ' (duplicate parent emails are merged)'
                      : audience === 'student_one'
                        ? ' (duplicate student emails are merged)'
                        : ''
                  }.`}
            </Typography>
          )}

          {recipients.length > 0 && (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Detail</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recipients.map((r) => (
                    <TableRow key={r.email}>
                      <TableCell>{r.email}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell sx={{ maxWidth: 360 }}>{r.label}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Stack>
      </Paper>

      <Dialog open={sendDialogOpen} onClose={() => !sending && setSendDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send email?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This will send &ldquo;{subject.trim()}&rdquo; to {recipientCount} recipient
            {recipientCount === 1 ? '' : 's'}.
            {attachments.length > 0 &&
              ` ${attachments.length} attachment${attachments.length === 1 ? '' : 's'} will be included.`}{' '}
            This cannot be undone.
          </DialogContentText>
          <FormControlLabel
            control={<Checkbox checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />}
            label="I have reviewed the recipient list and message"
          />
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={() => setSendDialogOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="contained"
            onClick={() => void sendMail()}
            disabled={!confirm || sending}
          >
            {sending ? 'Sending…' : 'Send now'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
