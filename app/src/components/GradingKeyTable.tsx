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
  variant?: 'overall' | 'module';
};

export function GradingKeyTable({ scale, compact = false, variant = 'overall' }: GradingKeyTableProps) {
  if (scale.length === 0) return null;

  const caption =
    variant === 'module'
      ? 'Letter grades apply to each module test. NS = 0% (did not take the test).'
      : 'Overall grade is the simple average of all module percentages, rounded to 2 decimal places.';

  return (
    <>
      <Typography variant={compact ? 'caption' : 'subtitle2'} color="text.secondary" sx={{ mb: 1 }}>
        {caption}
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Range</TableCell>
              <TableCell>Grade</TableCell>
              <TableCell>Code</TableCell>
              {variant === 'module' && <TableCell align="center">Credit (≥40%)</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {scale.map((band) => (
              <TableRow key={`${band.short}-${band.range}`}>
                <TableCell>{band.range}</TableCell>
                <TableCell>{band.label}</TableCell>
                <TableCell>
                  <strong>{band.short}</strong>
                </TableCell>
                {variant === 'module' && (
                  <TableCell align="center">{band.passed ? 'Yes' : '—'}</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
