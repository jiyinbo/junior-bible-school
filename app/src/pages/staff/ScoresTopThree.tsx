import { Box, Paper, Stack, Typography } from '@mui/material';
import { formatOverall, type TierTopStudent } from './scoresShared';

type Props = {
  students: TierTopStudent[];
};

export function ScoresTopThree({ students }: Props) {
  if (students.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Top 3
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No overall grades yet for this tier.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        Top 3
      </Typography>
      <Stack spacing={1.25}>
        {students.map((student, index) => (
          <Stack
            key={student.id}
            direction="row"
            alignItems="baseline"
            justifyContent="space-between"
            gap={2}
          >
            <Stack direction="row" alignItems="baseline" gap={1.5} sx={{ minWidth: 0 }}>
              <Box
                component="span"
                sx={{
                  width: 22,
                  flexShrink: 0,
                  fontWeight: 700,
                  color: 'text.secondary',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {index + 1}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {student.full_name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {student.registration_number}
                </Typography>
              </Box>
            </Stack>
            <Typography
              variant="body2"
              sx={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
            >
              {formatOverall(student)}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}
