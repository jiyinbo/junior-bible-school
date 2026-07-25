import { useMemo, useState } from 'react';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ListCard, ResponsiveTableLayout } from '../../components/ResponsiveTableLayout';
import { toastSuccess } from '../../feedback/toast';
import {
  exportMissingScoresCsv,
  type MissingScoreRow,
} from './scoresShared';

type Props = {
  open: boolean;
  onClose: () => void;
  rows: MissingScoreRow[];
  tierLabel: string;
};

function MissingScoreCard({ row }: { row: MissingScoreRow }) {
  return (
    <ListCard>
      <Typography fontWeight={600} sx={{ lineHeight: 1.3 }}>
        {row.full_name}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ mt: 0.25, fontVariantNumeric: 'tabular-nums' }}
      >
        {row.registration_number}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25, mb: 0.5, fontWeight: 600 }}>
        Missing modules
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {row.missing_modules.map((name) => (
          <Chip key={name} size="small" label={name} sx={{ maxWidth: '100%' }} />
        ))}
      </Box>
    </ListCard>
  );
}

export function MissingScoresDialog({ open, onClose, rows, tierLabel }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.full_name.toLowerCase().includes(q) ||
        row.registration_number.toLowerCase().includes(q) ||
        row.missing_modules.some((m) => m.toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const exportCsv = () => {
    const date = new Date().toISOString().slice(0, 10);
    const slug = tierLabel.replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '') || 'tier';
    exportMissingScoresCsv(rows, `jbs-missing-scores-${slug}-${date}.csv`);
    toastSuccess('Export downloaded');
  };

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
    >
      <DialogTitle>Missing scores</DialogTitle>
      <DialogContent>
        {rows.length === 0 ? (
          <Typography color="text.secondary">
            Every student in this tier has a score for every module.
          </Typography>
        ) : (
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              size="small"
              label="Search"
              placeholder="Name, registration, or module"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              fullWidth
            />
            <Typography color="text.secondary" variant="body2">
              {filtered.length === rows.length
                ? `${rows.length} student${rows.length === 1 ? '' : 's'} missing at least one module score.`
                : `${filtered.length} of ${rows.length} students shown.`}
            </Typography>
            {filtered.length === 0 ? (
              <Typography color="text.secondary">No students match the search.</Typography>
            ) : (
              <ResponsiveTableLayout
                table={
                  <TableContainer sx={{ maxHeight: 420 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: '32%' }}>Student</TableCell>
                          <TableCell>Missing modules</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filtered.map((row) => (
                          <TableRow key={row.id} hover>
                            <TableCell sx={{ verticalAlign: 'top' }}>
                              <Typography variant="body2" fontWeight={500}>
                                {row.full_name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontVariantNumeric: 'tabular-nums', display: 'block' }}
                              >
                                {row.registration_number}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                {row.missing_modules.map((name) => (
                                  <Chip key={name} size="small" label={name} />
                                ))}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                }
                cards={filtered.map((row) => (
                  <MissingScoreCard key={row.id} row={row} />
                ))}
              />
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions
        sx={{
          flexWrap: 'wrap',
          gap: 1,
          px: 3,
          pb: 2,
          justifyContent: { xs: 'stretch', sm: 'flex-end' },
          '& > :not(style)': { m: 0 },
          '& .MuiButton-root': { flex: { xs: '1 1 auto', sm: '0 0 auto' } },
        }}
      >
        <Button onClick={handleClose}>Close</Button>
        <Button
          variant="contained"
          startIcon={<FileDownloadOutlinedIcon />}
          disabled={rows.length === 0}
          onClick={exportCsv}
        >
          Export CSV
        </Button>
      </DialogActions>
    </Dialog>
  );
}
