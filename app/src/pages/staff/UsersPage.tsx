import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { FormRowButton, InlineFormRow } from '../../components/InlineFormRow';
import { toastSuccess } from '../../feedback/toast';
import { apiJson, parseApiError } from '../../api/http';
import { PageHeader } from '../../staff/PageHeader';
import { useStaffAuth } from '../../staff/StaffAuthContext';

type StaffUser = { id: number; name: string; email: string; role: string };
type StaffRole = 'admin' | 'teacher' | 'assistant';

function StaffUserRow({
  user,
  isSelf,
  onUpdated,
  onError,
}: {
  user: StaffUser;
  isSelf: boolean;
  onUpdated: () => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<StaffRole>(user.role as StaffRole);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setRole(user.role as StaffRole);
    setPassword('');
  }, [user]);

  const remove = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiJson(`/api/v1/admin/staff-users/${user.id}`, { method: 'DELETE' });
      toastSuccess('Staff account deleted.');
      setConfirmOpen(false);
      onUpdated();
    } catch (e) {
      setDeleteError(parseApiError(e));
    } finally {
      setDeleting(false);
    }
  };

  const save = async () => {
    setSaving(true);
    onError('');
    try {
      await apiJson(`/api/v1/admin/staff-users/${user.id}`, {
        method: 'PATCH',
        json: {
          name: name.trim(),
          email: email.trim(),
          role,
          ...(password ? { password } : {}),
        },
      });
      toastSuccess('Staff user updated.');
      setPassword('');
      setOpen(false);
      onUpdated();
    } catch (e) {
      onError(parseApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TableRow hover>
        <TableCell>{user.name}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>{user.role}</TableCell>
        <TableCell align="right" width={96}>
          <IconButton size="small" onClick={() => setOpen((o) => !o)} aria-label="Edit user">
            <EditIcon fontSize="small" />
          </IconButton>
          <Tooltip title={isSelf ? 'You cannot delete your own account' : 'Delete user'}>
            <span>
              <IconButton
                size="small"
                color="error"
                disabled={isSelf}
                onClick={() => {
                  setDeleteError(null);
                  setConfirmOpen(true);
                }}
                aria-label="Delete user"
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={4} sx={{ py: 0, borderBottom: open ? undefined : 0 }}>
          <Collapse in={open}>
            <Stack spacing={1.5} sx={{ py: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} size="small" fullWidth />
                <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} size="small" fullWidth />
              </Stack>
              <InlineFormRow>
                <TextField
                  select
                  label="Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as StaffRole)}
                  size="small"
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="teacher">Teacher</MenuItem>
                  <MenuItem value="assistant">Assistant</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </TextField>
                <TextField
                  label="New password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  size="small"
                  placeholder="Leave blank to keep"
                  sx={{ flex: 1, minWidth: 160 }}
                />
                <FormRowButton disabled={saving} onClick={() => void save()}>
                  {saving ? 'Saving…' : 'Save changes'}
                </FormRowButton>
              </InlineFormRow>
            </Stack>
          </Collapse>
        </TableCell>
      </TableRow>
      <Dialog open={confirmOpen} onClose={() => (deleting ? undefined : setConfirmOpen(false))} maxWidth="xs" fullWidth>
        <DialogTitle>Delete staff account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{user.name}</strong> ({user.email})? This cannot be undone.
          </DialogContentText>
          {deleteError && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={() => void remove()} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function UsersPage() {
  const { user: currentUser } = useStaffAuth();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>('teacher');

  const load = () => {
    apiJson<{ data: StaffUser[] }>('/api/v1/admin/staff-users')
      .then((r) => {
        setStaff(r.data);
        setError(null);
      })
      .catch(() => setError('Could not load staff users.'));
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setError(null);
    try {
      await apiJson('/api/v1/admin/staff-users', {
        method: 'POST',
        json: { name: name.trim(), email: email.trim(), password, role },
      });
      setName('');
      setEmail('');
      setPassword('');
      setRole('teacher');
      toastSuccess('Staff account created.');
      load();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Staff users"
        subtitle="Create admin, assistant or teacher accounts. Assign teachers to modules on a session detail page."
      />
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Create account
        </Typography>
        <InlineFormRow>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 140 }}
          />
          <TextField
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 200 }}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 140 }}
          />
          <TextField
            select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
            size="small"
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="teacher">Teacher</MenuItem>
            <MenuItem value="assistant">Assistant</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>
          <FormRowButton onClick={() => void create()}>Create</FormRowButton>
        </InlineFormRow>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Password must be at least 8 characters.
        </Typography>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {staff.map((u) => (
              <StaffUserRow
                key={u.id}
                user={u}
                isSelf={u.id === currentUser?.id}
                onUpdated={load}
                onError={setError}
              />
            ))}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}
