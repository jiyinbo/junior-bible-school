import { useMemo } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { OVERALL_GRADING_SCALE } from '../../utils/grading';
import type { TierStudentRow } from './scoresShared';

type Props = {
  students: TierStudentRow[];
};

export function ScoresBandCounts({ students }: Props) {
  const counts = useMemo(() => {
    const byLabel = new Map<string, number>();
    for (const band of OVERALL_GRADING_SCALE) {
      byLabel.set(band.label, 0);
    }
    let noOverall = 0;

    for (const student of students) {
      if (!student.overall_grade_label) {
        noOverall += 1;
        continue;
      }
      byLabel.set(
        student.overall_grade_label,
        (byLabel.get(student.overall_grade_label) ?? 0) + 1,
      );
    }

    return {
      bands: OVERALL_GRADING_SCALE.map((band) => ({
        label: band.label,
        short: band.short,
        count: byLabel.get(band.label) ?? 0,
      })),
      noOverall,
    };
  }, [students]);

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        Grade bands
      </Typography>
      <Stack spacing={1}>
        {counts.bands.map((band) => (
          <Stack
            key={band.label}
            direction="row"
            justifyContent="space-between"
            alignItems="baseline"
            gap={2}
          >
            <Typography variant="body2">
              {band.label}
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                ({band.short})
              </Typography>
            </Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {band.count}
            </Typography>
          </Stack>
        ))}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="baseline"
          gap={2}
          sx={{ pt: 0.5, borderTop: 1, borderColor: 'divider' }}
        >
          <Typography variant="body2" color="text.secondary">
            No overall yet
          </Typography>
          <Typography
            variant="body2"
            fontWeight={600}
            color="text.secondary"
            sx={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {counts.noOverall}
          </Typography>
        </Stack>
        <Box sx={{ pt: 0.25 }}>
          <Typography variant="caption" color="text.secondary">
            {students.length} student{students.length === 1 ? '' : 's'} in tier
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
