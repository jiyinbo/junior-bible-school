import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { GradingBand } from '../utils/grading';

type GradingKeyTableProps = {
  scale: GradingBand[];
  compact?: boolean;
};

export function GradingKeyTable({ scale, compact = false }: GradingKeyTableProps) {
  if (scale.length === 0) return null;

  return (
    <>
      <Typography variant={compact ? 'caption' : 'subtitle2'} color="text.secondary" sx={{ mb: 1 }}>
        Pass mark: 40%. Distinction, Upper Credit, and other bands apply to the overall average only.
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Range</TableCell>
              <TableCell>Grade</TableCell>
              <TableCell>Code</TableCell>
              <TableCell align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scale.map((band) => (
              <TableRow key={band.short}>
                <TableCell>{band.range}</TableCell>
                <TableCell>{band.label}</TableCell>
                <TableCell>
                  <strong>{band.short}</strong>
                </TableCell>
                <TableCell align="center">{band.passed ? 'Pass' : 'Fail'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
