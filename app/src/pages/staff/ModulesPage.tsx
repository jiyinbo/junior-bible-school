import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { apiJson } from '../../api/http';
import { PageHeader } from '../../staff/PageHeader';
import { useStaffAuth } from '../../staff/StaffAuthContext';

type ModuleRow = {
  assignment_id: number;
  module: { id: number; name: string; code: string | null };
  level: string;
  session: string;
  teacher: string;
  test_status: string | null;
};

export function ModulesPage() {
  const { isAdmin } = useStaffAuth();
  const [rows, setRows] = useState<ModuleRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiJson<{ data: ModuleRow[] }>('/api/v1/staff/my-modules')
      .then((r) => setRows(r.data))
      .catch(() => setError('Could not load modules.'));
  }, []);

  return (
    <>
      <PageHeader
        title="My modules"
        subtitle={
          isAdmin
            ? 'All module assignments. Teachers only see modules assigned to them.'
            : 'Modules assigned to you. Edit tests and enter scores from here.'
        }
      />
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Session</TableCell>
              <TableCell>Tier</TableCell>
              <TableCell>Module</TableCell>
              <TableCell>Teacher</TableCell>
              <TableCell>Test</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.assignment_id}>
                <TableCell>{r.session}</TableCell>
                <TableCell>{r.level}</TableCell>
                <TableCell>
                  {r.module.name}
                  {r.module.code && (
                    <Chip size="small" label={r.module.code} sx={{ ml: 1 }} />
                  )}
                </TableCell>
                <TableCell>{r.teacher}</TableCell>
                <TableCell>
                  <Chip size="small" label={r.test_status ?? 'draft'} />
                </TableCell>
                <TableCell align="right">
                  <Button
                    component={RouterLink}
                    to={`/staff/modules/${r.module.id}/test`}
                    size="small"
                    variant="outlined"
                  >
                    Test
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && !error && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    No modules yet. Ask an admin to assign you on a session.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}
