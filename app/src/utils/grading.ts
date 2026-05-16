export type GradingBand = {
  min_percent: number;
  max_percent: number;
  label: string;
  short: string;
  range: string;
  passed: boolean;
};

export type GradeFields = {
  percent?: number | null;
  grade_label?: string | null;
  grade_short?: string | null;
  passed?: boolean;
};

export function gradeChipColor(
  passed: boolean | undefined,
  short?: string | null,
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (passed === false) return 'error';
  if (short === 'D') return 'success';
  if (short === 'UC' || short === 'LC') return 'info';
  if (short === 'P') return 'warning';
  return 'default';
}

export function formatGradeLabel(fields: GradeFields): string {
  if (fields.grade_label && fields.percent != null) {
    return `${fields.grade_label} (${fields.percent}%)`;
  }
  if (fields.grade_label) return fields.grade_label;
  if (fields.percent != null) return `${fields.percent}%`;
  return '—';
}
