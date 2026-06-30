export type GradingBand = {
  min_percent: number;
  max_percent: number;
  label: string;
  short: string;
  range: string;
  passed: boolean;
};

/** Official overall scale — simple average across modules (2 d.p.). */
export const OVERALL_GRADING_SCALE: GradingBand[] = [
  { min_percent: 70, max_percent: 100, label: 'Distinction', short: 'D', range: '≥70%', passed: true },
  { min_percent: 60, max_percent: 69, label: 'Merit', short: 'M', range: '≥60% and <70%', passed: true },
  { min_percent: 50, max_percent: 59, label: 'Upper Credit', short: 'UC', range: '≥50% and <60%', passed: true },
  { min_percent: 40, max_percent: 49, label: 'Lower Credit', short: 'LC', range: '≥40% and <50%', passed: true },
  { min_percent: 0, max_percent: 39, label: 'Pass', short: 'P', range: '<40%', passed: true },
];

/** Official per-module letter scale. */
export const MODULE_GRADING_SCALE: GradingBand[] = [
  {
    min_percent: 0,
    max_percent: 0,
    label: 'No Show',
    short: 'NS',
    range: '0% (did not take test)',
    passed: false,
  },
  { min_percent: 70, max_percent: 100, label: 'A', short: 'A', range: '≥70%', passed: true },
  { min_percent: 60, max_percent: 69, label: 'B', short: 'B', range: '≥60% and <70%', passed: true },
  { min_percent: 50, max_percent: 59, label: 'C', short: 'C', range: '≥50% and <60%', passed: true },
  { min_percent: 40, max_percent: 49, label: 'D', short: 'D', range: '≥40% and <50%', passed: true },
  { min_percent: 30, max_percent: 39, label: 'E', short: 'E', range: '≥30% and <40%', passed: false },
  { min_percent: 1, max_percent: 29, label: 'F', short: 'F', range: '<30%', passed: false },
];

export const GRADUATION_MAX_MISSED_TESTS = 2;

export type GradeFields = {
  percent?: number | null;
  grade_label?: string | null;
  grade_short?: string | null;
  passed?: boolean;
};

export function gradeChipColor(
  passed: boolean | undefined,
  short?: string | null,
  variant: 'overall' | 'module' = 'module',
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (variant === 'module') {
    if (short === 'NS') return 'default';
    if (passed === false) return 'error';
    if (short === 'A') return 'success';
    if (short === 'B' || short === 'C') return 'info';
    if (short === 'D') return 'warning';
    return 'default';
  }

  if (short === 'D') return 'success';
  if (short === 'M' || short === 'UC' || short === 'LC') return 'info';
  if (short === 'P') return 'warning';
  return 'default';
}

export function formatGradeLabel(fields: GradeFields): string {
  if (fields.grade_label && fields.percent != null) {
    const pct =
      typeof fields.percent === 'number' && !Number.isInteger(fields.percent)
        ? fields.percent.toFixed(2)
        : String(fields.percent);
    return `${fields.grade_label} (${pct}%)`;
  }
  if (fields.grade_label) return fields.grade_label;
  if (fields.percent != null) {
    const pct =
      typeof fields.percent === 'number' && !Number.isInteger(fields.percent)
        ? fields.percent.toFixed(2)
        : String(fields.percent);
    return `${pct}%`;
  }
  return '—';
}

export function formatModuleGrade(fields: GradeFields): string {
  if (fields.grade_short) {
    return fields.percent != null ? `${fields.grade_short} (${fields.percent}%)` : fields.grade_short;
  }
  return formatGradeLabel(fields);
}
