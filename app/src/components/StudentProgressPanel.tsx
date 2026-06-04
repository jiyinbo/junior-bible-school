import type { ReactNode } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { GradingKeyTable } from './GradingKeyTable';
import { ProgressSummaryStrip, type ProgressStatItem } from './ProgressSummaryStrip';
import {
  GRADUATION_MAX_MISSED_TESTS,
  MODULE_GRADING_SCALE,
  OVERALL_GRADING_SCALE,
  formatModuleGrade,
  gradeChipColor,
} from '../utils/grading';

export type StudentProgressModule = {
  module_id: number;
  module_name: string;
  test_taken: boolean;
  test_passed?: boolean;
  score?: number | null;
  max_score?: number | null;
  percent?: number | null;
  grade_label?: string | null;
  grade_short?: string | null;
  source?: string | null;
};

export type StudentProgressData = {
  attendance_days: number;
  tests_total: number;
  tests_taken: number;
  tests_passed?: number;
  tests_missed?: number;
  programme_phase?: string;
  graduation_pending?: boolean;
  eligible_for_graduation?: boolean | null;
  level_completed: boolean;
  modules: StudentProgressModule[];
  overall_percent?: number | null;
  overall_grade_label?: string | null;
  overall_grade_short?: string | null;
};

export function studentProgressStats(
  progress: StudentProgressData,
  programmePhase?: string,
) {
  const phase = programmePhase ?? progress.programme_phase;
  const testsTaken = Math.max(0, Number(progress.tests_taken ?? 0));
  const testsTotal = Math.max(0, Number(progress.tests_total ?? 0));
  let testsMissed = Math.max(
    0,
    Number(
      progress.tests_missed ??
        Math.max(0, testsTotal - testsTaken),
    ),
  );

  const phaseEnded = phase === 'ended' || phase === 'past';
  const graduationPending =
    progress.graduation_pending === true ||
    phase === 'upcoming' ||
    (testsTaken === 0 && !phaseEnded) ||
    (testsTaken === 0 && testsMissed > 0);

  if (graduationPending) {
    return { testsMissed: 0, eligibleForGraduation: null, graduationPending: true, phase };
  }

  if (progress.eligible_for_graduation !== undefined && progress.eligible_for_graduation !== null) {
    return {
      testsMissed,
      eligibleForGraduation: progress.eligible_for_graduation,
      graduationPending: false,
      phase,
    };
  }

  return {
    testsMissed,
    eligibleForGraduation: testsMissed <= GRADUATION_MAX_MISSED_TESTS,
    graduationPending: false,
    phase,
  };
}

function graduationPendingDetail(
  phase: string | undefined,
  isStudent: boolean,
): string {
  if (phase === 'upcoming') {
    return 'Programme not started yet';
  }
  if (isStudent) {
    return 'Tracked once you complete module tests';
  }
  return 'No module results recorded yet';
}

function buildSummaryItems(
  p: StudentProgressData,
  variant: 'student' | 'staff',
  stats: ReturnType<typeof studentProgressStats>,
): ProgressStatItem[] {
  const { testsMissed, eligibleForGraduation, graduationPending, phase } = stats;
  const isStudent = variant === 'student';

  const graduationValue = graduationPending ? (
    'Pending'
  ) : eligibleForGraduation ? (
    'Eligible'
  ) : (
    'Not presented'
  );
  const graduationColor = graduationPending
    ? 'text.secondary'
    : eligibleForGraduation
      ? 'success.main'
      : 'warning.main';
  const graduationDetail = graduationPending
    ? graduationPendingDetail(phase, isStudent)
    : eligibleForGraduation
      ? `${testsMissed} missed · max ${GRADUATION_MAX_MISSED_TESTS}`
      : `${testsMissed} missed · max ${GRADUATION_MAX_MISSED_TESTS} allowed`;

  const items: ProgressStatItem[] = [
    {
      id: 'attendance',
      label: 'Attendance',
      value: `${p.attendance_days} ${p.attendance_days === 1 ? 'day' : 'days'}`,
    },
    {
      id: 'modules',
      label: 'Modules completed',
      value: `${p.tests_taken} / ${p.tests_total}`,
      detail: isStudent ? 'Submitted tests' : 'With a recorded result',
    },
  ];

  if (!isStudent && !graduationPending && p.tests_passed != null) {
    items.push({
      id: 'passed',
      label: 'At grade D+',
      value: String(p.tests_passed),
      detail: '≥40% module score',
      valueColor: 'success.main',
    });
  }

  if (!isStudent && !graduationPending && p.overall_grade_label != null && p.overall_percent != null) {
    items.push({
      id: 'overall',
      label: 'Overall',
      value: p.overall_grade_label,
      detail: `${typeof p.overall_percent === 'number' ? p.overall_percent.toFixed(2) : p.overall_percent}% avg`,
      valueColor: 'primary.main',
    });
  }

  items.push(
    {
      id: 'graduation',
      label: 'Graduation',
      value: graduationValue,
      detail: graduationDetail,
      valueColor: graduationColor,
    },
    {
      id: 'tier',
      label: 'Tier',
      value: p.level_completed ? 'Completed' : 'In progress',
      valueColor: p.level_completed ? 'success.main' : undefined,
    },
  );

  return items;
}

function ModuleResultReadOnlyRow({
  module,
  variant,
}: {
  module: StudentProgressModule;
  variant: 'student' | 'staff';
}) {
  if (variant === 'student') {
    return (
      <TableRow>
        <TableCell>{module.module_name}</TableCell>
        <TableCell>
          {module.test_taken ? (
            <Chip size="small" color="success" label="Completed" />
          ) : (
            <Chip size="small" label="Not completed" />
          )}
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>{module.module_name}</TableCell>
      <TableCell>
        {module.test_taken && module.score != null ? `${module.score} / ${module.max_score}` : '—'}
      </TableCell>
      <TableCell>{module.test_taken && module.percent != null ? `${module.percent}%` : '—'}</TableCell>
      <TableCell>
        {module.test_taken && module.grade_short ? (
          <Chip
            size="small"
            label={formatModuleGrade(module)}
            color={gradeChipColor(module.test_passed, module.grade_short, 'module')}
          />
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell>{module.source ?? '—'}</TableCell>
      <TableCell>
        {!module.test_taken && <Chip size="small" label="Not taken" />}
        {module.test_taken && module.test_passed && (
          <Chip size="small" color="success" label="Credit (D+)" />
        )}
        {module.test_taken && !module.test_passed && (
          <Chip
            size="small"
            color="error"
            label={module.grade_short === 'NS' ? 'No show' : 'Below credit'}
          />
        )}
      </TableCell>
    </TableRow>
  );
}

type StudentModulesTableProps = {
  progress: StudentProgressData;
  variant?: 'student' | 'staff';
  moduleRows?: ReactNode;
  showAdminColumn?: boolean;
  adminColumnFooter?: ReactNode;
};

export function StudentModulesTable({
  progress,
  variant = 'student',
  moduleRows,
  showAdminColumn = false,
  adminColumnFooter,
}: StudentModulesTableProps) {
  const isStudent = variant === 'student';
  const modules = progress.modules ?? [];

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Module</TableCell>
            {isStudent ? (
              <TableCell>Status</TableCell>
            ) : (
              <>
                <TableCell>Score</TableCell>
                <TableCell>%</TableCell>
                <TableCell>Grade</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Status</TableCell>
              </>
            )}
            {showAdminColumn && <TableCell align="right" />}
          </TableRow>
        </TableHead>
        <TableBody>
          {moduleRows ??
            modules.map((m) => (
              <ModuleResultReadOnlyRow key={m.module_id} module={m} variant={variant} />
            ))}
        </TableBody>
      </Table>
      {adminColumnFooter}
    </Box>
  );
}

export function GradingScaleDetails({ variant }: { variant: 'student' | 'staff' }) {
  const isStudent = variant === 'student';

  return (
    <>
      <Typography variant="subtitle2" gutterBottom>
        {isStudent ? 'Overall grading scale' : 'Overall'}
      </Typography>
      <GradingKeyTable scale={OVERALL_GRADING_SCALE} compact variant="overall" />
      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
        {isStudent ? 'Module grading scale' : 'Per module'}
      </Typography>
      <GradingKeyTable scale={MODULE_GRADING_SCALE} compact variant="module" />
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
        {isStudent
          ? `Students who miss more than ${GRADUATION_MAX_MISSED_TESTS} tests (3 or more) are not presented for graduation.`
          : 'Miss 3 or more tests → not presented for graduation.'}
      </Typography>
    </>
  );
}

type StudentProgressPanelProps = {
  progress: StudentProgressData;
  programmePhase?: string;
  variant?: 'student' | 'staff';
  /** Per-module table; off on student portal (timetable lists courses; summary strip shows X/Y completed). */
  showModuleTable?: boolean;
  moduleRows?: ReactNode;
  showGradingScales?: boolean;
  showAdminColumn?: boolean;
  adminColumnFooter?: ReactNode;
};

export function StudentProgressPanel({
  progress,
  programmePhase,
  variant = 'staff',
  showModuleTable,
  moduleRows,
  showGradingScales,
  showAdminColumn = false,
  adminColumnFooter,
}: StudentProgressPanelProps) {
  const p = progress;
  const isStudent = variant === 'student';
  const showScales = showGradingScales ?? true;
  const showModules = showModuleTable ?? !isStudent;
  const stats = studentProgressStats(p, programmePhase);
  const summaryItems = buildSummaryItems(p, variant, stats);

  return (
    <>
      <ProgressSummaryStrip items={summaryItems} />

      {showModules && (
        <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'grey.50',
            }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              {isStudent ? 'Modules' : 'Module results'}
            </Typography>
            {isStudent && (
              <Typography variant="caption" color="text.secondary">
                Completion only — scores are not shown to students.
              </Typography>
            )}
          </Box>
          <Box sx={{ px: 2 }}>
            <StudentModulesTable
              progress={p}
              variant={variant}
              moduleRows={moduleRows}
              showAdminColumn={showAdminColumn}
              adminColumnFooter={adminColumnFooter}
            />
          </Box>
        </Paper>
      )}

      {showScales && !isStudent && (
        <Accordion
          disableGutters
          elevation={0}
          sx={{ mt: 2, border: 1, borderColor: 'divider', '&:before': { display: 'none' } }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Grading scales (reference)</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <GradingScaleDetails variant="staff" />
          </AccordionDetails>
        </Accordion>
      )}
    </>
  );
}
