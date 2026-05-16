import { useEffect, useState } from 'react';
import {
  Collapse,
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
import EditIcon from '@mui/icons-material/Edit';
import { FormRowButton, InlineFormRow } from '../../components/InlineFormRow';
import { toastSuccess } from '../../feedback/toast';
import { apiJson, parseApiError } from '../../api/http';
import { PageHeader } from '../../staff/PageHeader';

type StaffUser = { id: number; name: string; email: string; role: string };

function StaffUserRow({
  user,
  onUpdated,
  onError,
}: {
  user: StaffUser;
  onUpdated: () => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<'admin' | 'teacher'>(user.role as 'admin' | 'teacher');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setRole(user.role as 'admin' | 'teacher');
    setPassword('');
  }, [user]);

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
        <TableCell align="right" width={56}>
          <IconButton size="small" onClick={() => setOpen((o) => !o)} aria-label="Edit user">
            <EditIcon fontSize="small" />
          </IconButton>
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
                  onChange={(e) => setRole(e.target.value as 'admin' | 'teacher')}
                  size="small"
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="teacher">Teacher</MenuItem>
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
    </>
  );
}

export function UsersPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'teacher'>('teacher');

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
        subtitle="Create admin or teacher accounts. Assign teachers to modules on a session detail page."
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
            onChange={(e) => setRole(e.target.value as 'admin' | 'teacher')}
            size="small"
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="teacher">Teacher</MenuItem>
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
              <StaffUserRow key={u.id} user={u} onUpdated={load} onError={setError} />
            ))}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}
