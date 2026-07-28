import { Box, Paper, Stack, Typography } from '@mui/material';
import type { TierTopStudent } from './scoresShared';

type Props = {
  students: TierTopStudent[];
};

function topThreeSummary(students: TierTopStudent[]): { title: string; detail: string } {
  const count = students.length;
  const ranks = students.map((s) => s.rank);
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b);
  const hasTies = ranks.length > uniqueRanks.length;
  const minRank = uniqueRanks[0];
  const maxRank = uniqueRanks[uniqueRanks.length - 1];
  const placesLabel =
    minRank === maxRank ? `place ${minRank}` : `places ${minRank}–${maxRank}`;

  const modules = students[0]?.modules_scored;
  const sameModules = modules != null && students.every((s) => s.modules_scored === modules);
  const testsLabel =
    sameModules && modules != null
      ? modules === 1
        ? '1 test sat'
        : `${modules} tests sat`
      : null;

  const title = hasTies
    ? `Top 3 · ${count} students (incl. ties)`
    : `Top 3 · ${count} student${count === 1 ? '' : 's'}`;

  const detail = [placesLabel, testsLabel].filter(Boolean).join(' · ');

  return { title, detail };
}

function TopThreeScore({ student }: { student: TierTopStudent }) {
  const total = `${student.overall_score}/${student.overall_max_score}`;
  const percent = `${student.overall_percent}%`;
  const grade = student.overall_grade_label;
  const testsLabel =
    student.modules_scored === 1 ? '1 test' : `${student.modules_scored} tests`;
  const detail = [grade, testsLabel].filter(Boolean).join(' · ');

  return (
    <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
      <Typography
        variant="body2"
        sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.3, whiteSpace: 'nowrap' }}
      >
        {total} · {percent}
      </Typography>
      {detail ? (
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ lineHeight: 1.3, mt: 0.15, whiteSpace: 'nowrap' }}
        >
          {detail}
        </Typography>
      ) : null}
    </Box>
  );
}

export function ScoresTopThree({ students }: Props) {
  if (students.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2, maxWidth: '100%', overflow: 'hidden' }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Top 3
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No overall grades yet for this tier.
        </Typography>
      </Paper>
    );
  }

  const { title, detail } = topThreeSummary(students);

  return (
    <Paper variant="outlined" sx={{ p: 2, maxWidth: '100%', overflow: 'hidden' }}>
      <Typography variant="subtitle2" sx={{ mb: detail ? 0.25 : 1.5 }}>
        {title}
      </Typography>
      {detail ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
          {detail}
        </Typography>
      ) : null}
      <Stack spacing={1.25} sx={{ minWidth: 0 }}>
        {students.map((student) => (
          <Stack
            key={student.id}
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            gap={1.5}
            sx={{ minWidth: 0, width: '100%' }}
          >
            <Stack direction="row" alignItems="center" gap={1.25} sx={{ minWidth: 0, flex: 1 }}>
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
                {student.rank}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {student.full_name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {student.registration_number}
                </Typography>
              </Box>
            </Stack>
            <TopThreeScore student={student} />
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}
