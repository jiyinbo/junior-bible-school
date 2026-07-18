import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
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
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  EmptyTableMessage,
  ResponsiveTableLayout,
} from '../../components/ResponsiveTableLayout';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { FormRowButton, InlineFormRow } from '../../components/InlineFormRow';
import { toastSuccess } from '../../feedback/toast';
import { apiJson, parseApiError } from '../../api/http';
import { PageHeader } from '../../staff/PageHeader';
import { useStaffAuth } from '../../staff/StaffAuthContext';

type StaffUser = { id: number; name: string; email: string; role: string };
type StaffRole = 'admin' | 'teacher' | 'assistant';
type SortKey = 'name' | 'email' | 'role';
type SortDir = 'asc' | 'desc';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

function compareStaff(a: StaffUser, b: StaffUser, key: SortKey, dir: SortDir): number {
  const cmp = a[key].localeCompare(b[key], undefined, { sensitivity: 'base' });
  return dir === 'asc' ? cmp : -cmp;
}

function StaffUserEditForm({
  name,
  setName,
  email,
  setEmail,
  role,
  setRole,
  password,
  setPassword,
  saving,
  onSave,
}: {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  role: StaffRole;
  setRole: (v: StaffRole) => void;
  password: string;
  setPassword: (v: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
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
        <FormRowButton disabled={saving} onClick={() => void onSave()}>
          {saving ? 'Saving…' : 'Save changes'}
        </FormRowButton>
      </InlineFormRow>
    </Stack>
  );
}

function StaffUserActions({
  isSelf,
  onEdit,
  onDelete,
}: {
  isSelf: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
      <IconButton size="small" onClick={onEdit} aria-label="Edit user">
        <EditIcon fontSize="small" />
      </IconButton>
      <Tooltip title={isSelf ? 'You cannot delete your own account' : 'Delete user'}>
        <span>
          <IconButton
            size="small"
            color="error"
            disabled={isSelf}
            onClick={onDelete}
            aria-label="Delete user"
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

function StaffUserRow({
  user,
  isSelf,
  layout,
  onUpdated,
  onError,
}: {
  user: StaffUser;
  isSelf: boolean;
  layout: 'table' | 'card';
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

  const editForm = (
    <StaffUserEditForm
      name={name}
      setName={setName}
      email={email}
      setEmail={setEmail}
      role={role}
      setRole={setRole}
      password={password}
      setPassword={setPassword}
      saving={saving}
      onSave={save}
    />
  );

  const deleteDialog = (
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
  );

  const openDelete = () => {
    setDeleteError(null);
    setConfirmOpen(true);
  };

  if (layout === 'card') {
    return (
      <>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={600}>{user.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                {user.email}
              </Typography>
              <Chip size="small" label={user.role} sx={{ mt: 1 }} />
            </Box>
            <StaffUserActions
              isSelf={isSelf}
              onEdit={() => setOpen((o) => !o)}
              onDelete={openDelete}
            />
          </Stack>
          <Collapse in={open}>{editForm}</Collapse>
        </Paper>
        {deleteDialog}
      </>
    );
  }

  return (
    <>
      <TableRow hover>
        <TableCell>{user.name}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>{user.role}</TableCell>
        <TableCell align="right" width={96}>
          <StaffUserActions
            isSelf={isSelf}
            onEdit={() => setOpen((o) => !o)}
            onDelete={openDelete}
          />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={4} sx={{ py: 0, borderBottom: open ? undefined : 0 }}>
          <Collapse in={open}>{editForm}</Collapse>
        </TableCell>
      </TableRow>
      {deleteDialog}
    </>
  );
}

function CreateStaffUserDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>('teacher');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setEmail('');
    setPassword('');
    setRole('teacher');
    setError(null);
  }, [open]);

  const create = async () => {
    setError(null);
    setSaving(true);
    try {
      await apiJson('/api/v1/admin/staff-users', {
        method: 'POST',
        json: { name: name.trim(), email: email.trim(), password, role },
      });
      toastSuccess('Staff account created.');
      onCreated();
      onClose();
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = name.trim() !== '' && email.trim() !== '' && password.length >= 8;

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create account</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            autoFocus
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            helperText="Password must be at least 8 characters."
          />
          <TextField
            select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
            fullWidth
            required
          >
            <MenuItem value="teacher">Teacher</MenuItem>
            <MenuItem value="assistant">Assistant</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={saving || !canSubmit}
          onClick={() => void create()}
        >
          {saving ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function UsersPage() {
  const { user: currentUser } = useStaffAuth();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | StaffRole>('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

  useEffect(() => {
    setPage(0);
  }, [filterQuery, roleFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  };

  const filteredStaff = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    let rows = staff;

    if (q) {
      rows = rows.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      );
    }
    if (roleFilter) {
      rows = rows.filter((u) => u.role === roleFilter);
    }

    return [...rows].sort((a, b) => compareStaff(a, b, sortKey, sortDir));
  }, [staff, filterQuery, roleFilter, sortKey, sortDir]);

  const maxPage = Math.max(0, Math.ceil(filteredStaff.length / rowsPerPage) - 1);
  const currentPage = Math.min(page, maxPage);
  const visibleStaff = filteredStaff.slice(
    currentPage * rowsPerPage,
    currentPage * rowsPerPage + rowsPerPage,
  );

  return (
    <>
      <PageHeader
        title="Staff users"
        subtitle="Create admin, assistant or teacher accounts. Assign teachers to modules on a session detail page."
        action={
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            Create account
          </Button>
        }
      />
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <Paper sx={{ p: { xs: 2, md: 2 }, overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
            mb: 2,
          }}
        >
          <TextField
            size="small"
            label="Filter staff"
            placeholder="Name or email"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            sx={{ minWidth: 220, flex: '1 1 220px' }}
          />
          <TextField
            select
            size="small"
            label="Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as '' | StaffRole)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All roles</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="assistant">Assistant</MenuItem>
            <MenuItem value="teacher">Teacher</MenuItem>
          </TextField>
        </Box>
        <ResponsiveTableLayout
          isEmpty={filteredStaff.length === 0}
          empty={
            <EmptyTableMessage>
              {staff.length === 0
                ? 'No staff users yet.'
                : 'No staff users match the current filters.'}
            </EmptyTableMessage>
          }
          table={
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={sortKey === 'name' ? sortDir : false}>
                    <TableSortLabel
                      active={sortKey === 'name'}
                      direction={sortKey === 'name' ? sortDir : 'asc'}
                      onClick={() => toggleSort('name')}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sortKey === 'email' ? sortDir : false}>
                    <TableSortLabel
                      active={sortKey === 'email'}
                      direction={sortKey === 'email' ? sortDir : 'asc'}
                      onClick={() => toggleSort('email')}
                    >
                      Email
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sortKey === 'role' ? sortDir : false}>
                    <TableSortLabel
                      active={sortKey === 'role'}
                      direction={sortKey === 'role' ? sortDir : 'asc'}
                      onClick={() => toggleSort('role')}
                    >
                      Role
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleStaff.map((u) => (
                  <StaffUserRow
                    key={u.id}
                    layout="table"
                    user={u}
                    isSelf={u.id === currentUser?.id}
                    onUpdated={load}
                    onError={setError}
                  />
                ))}
              </TableBody>
            </Table>
          }
          cards={visibleStaff.map((u) => (
            <StaffUserRow
              key={u.id}
              layout="card"
              user={u}
              isSelf={u.id === currentUser?.id}
              onUpdated={load}
              onError={setError}
            />
          ))}
        />
        {filteredStaff.length > 0 && (
          <TablePagination
            component="div"
            count={filteredStaff.length}
            page={currentPage}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            labelDisplayedRows={({ from, to, count }) =>
              count === 0 ? '0 staff' : `${from}–${to} of ${count}`
            }
            sx={{
              borderTop: 1,
              borderColor: 'divider',
              px: { xs: 0, md: 0 },
              '.MuiTablePagination-toolbar': {
                flexWrap: 'wrap',
                gap: 1,
                px: 0,
              },
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                m: 0,
              },
            }}
          />
        )}
      </Paper>

      <CreateStaffUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />
    </>
  );
}
