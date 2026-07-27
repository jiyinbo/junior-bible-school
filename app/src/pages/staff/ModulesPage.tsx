import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  DetailRow,
  ListCard,
  EmptyTableMessage,
  ResponsiveTableLayout,
} from '../../components/ResponsiveTableLayout';
import { apiJson } from '../../api/http';
import { PageHeader } from '../../staff/PageHeader';
import { useStaffAuth } from '../../staff/StaffAuthContext';

type ModuleRow = {
  assignment_id: number | null;
  module: { id: number; name: string; code: string | null };
  level: string;
  session: string;
  teacher: string;
  test_status: string | null;
};

function ModuleCard({ row }: { row: ModuleRow }) {
  return (
    <ListCard
      action={
        <Button
          component={RouterLink}
          to={`/staff/modules/${row.module.id}/test`}
          size="small"
          variant="outlined"
        >
          Test
        </Button>
      }
    >
      <Typography fontWeight={600}>{row.module.name}</Typography>
      {row.module.code && (
        <Chip size="small" label={row.module.code} sx={{ mt: 0.75, alignSelf: 'flex-start' }} />
      )}
      <Stack spacing={0.25} sx={{ mt: 1.5 }}>
        <DetailRow label="Session">
          <Typography variant="body2">{row.session}</Typography>
        </DetailRow>
        <DetailRow label="Tier">
          <Typography variant="body2">{row.level}</Typography>
        </DetailRow>
        <DetailRow label="Teacher">
          <Typography variant="body2">{row.teacher}</Typography>
        </DetailRow>
        <DetailRow label="Test">
          <Chip size="small" label={row.test_status ?? 'draft'} />
        </DetailRow>
      </Stack>
    </ListCard>
  );
}

export function ModulesPage() {
  const { user, isAdmin } = useStaffAuth();
  const [rows, setRows] = useState<ModuleRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const seesAllModules = isAdmin || user?.role === 'assistant';

  useEffect(() => {
    apiJson<{ data: ModuleRow[] }>('/api/v1/staff/my-modules')
      .then((r) => setRows(r.data))
      .catch(() => setError('Could not load modules.'));
  }, []);

  const empty = (
    <EmptyTableMessage>
      {seesAllModules
        ? 'No modules yet. Add modules on a session first.'
        : 'No modules yet. Ask an admin to assign you on a session.'}
    </EmptyTableMessage>
  );

  return (
    <>
      <PageHeader
        title="My modules"
        subtitle={
          seesAllModules
            ? 'All modules. Open or close tests and enter scores from here.'
            : 'Modules assigned to you. Edit tests and enter scores from here.'
        }
      />
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <Paper sx={{ p: { xs: 2, md: 0 }, overflow: 'hidden' }}>
        <ResponsiveTableLayout
          isEmpty={rows.length === 0 && !error}
          empty={empty}
          table={
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
                  <TableRow key={r.module.id}>
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
              </TableBody>
            </Table>
          }
          cards={rows.map((r) => (
            <ModuleCard key={r.module.id} row={r} />
          ))}
        />
      </Paper>
    </>
  );
}
