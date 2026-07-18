export type ModuleOption = {
  module: { id: number; name: string };
  session: string;
  level: string;
};

export type LevelOption = {
  key: string;
  label: string;
  session: string;
  level: string;
};

export type TierModule = {
  id: number;
  name: string;
  code: string | null;
  sort_order: number;
};

export type ModuleScoreCell = {
  score: number;
  max_score: number;
  percent: number;
  grade_short: string;
} | null;

export type TierStudentRow = {
  id: number;
  registration_number: string;
  full_name: string;
  modules: Record<string, ModuleScoreCell>;
  overall_score: number | null;
  overall_max_score: number | null;
  overall_percent: number | null;
  overall_grade_short: string | null;
  overall_grade_label: string | null;
};

export type TierTopStudent = {
  id: number;
  registration_number: string;
  full_name: string;
  overall_score: number;
  overall_max_score: number;
  overall_percent: number;
  overall_grade_short: string | null;
  overall_grade_label: string | null;
};

export type TierBoardData = {
  modules: TierModule[];
  students: TierStudentRow[];
  top3: TierTopStudent[];
};

export function sessionLevelKey(m: Pick<ModuleOption, 'session' | 'level'>): string {
  return `${m.session}\u0001${m.level}`;
}

export function parseSessionLevelKey(key: string): { session: string; level: string } | null {
  const sep = key.indexOf('\u0001');
  if (sep < 0) return null;
  return { session: key.slice(0, sep), level: key.slice(sep + 1) };
}

export function formatModuleCell(cell: ModuleScoreCell): string {
  if (!cell) return '—';
  return `${cell.percent} · ${cell.grade_short}`;
}

export function formatOverall(
  student: Pick<
    TierStudentRow,
    'overall_score' | 'overall_max_score' | 'overall_percent' | 'overall_grade_label'
  >,
): string {
  if (student.overall_percent === null || student.overall_score === null || student.overall_max_score === null) {
    return '—';
  }
  const total = `${student.overall_score}/${student.overall_max_score}`;
  const label = student.overall_grade_label ?? '';
  return label
    ? `${total} · ${student.overall_percent}% · ${label}`
    : `${total} · ${student.overall_percent}%`;
}

export function moduleHeading(module: TierModule, short: boolean): string {
  if (short && module.code) return module.code;
  return module.name;
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Download the tier scores board as CSV (client-side). */
export function exportTierBoardCsv(
  modules: TierModule[],
  students: TierStudentRow[],
  filename: string,
): void {
  const headers = [
    'Student',
    'Registration number',
    ...modules.map((m) => m.code || m.name),
    'Overall score',
    'Overall max',
    'Overall percent',
    'Overall grade',
  ];

  const lines = [
    headers.map(csvEscape).join(','),
    ...students.map((student) => {
      const cells = [
        student.full_name,
        student.registration_number,
        ...modules.map((m) => formatModuleCell(student.modules[String(m.id)] ?? null)),
        student.overall_score === null ? '' : String(student.overall_score),
        student.overall_max_score === null ? '' : String(student.overall_max_score),
        student.overall_percent === null ? '' : String(student.overall_percent),
        student.overall_grade_label ?? '',
      ];
      return cells.map(csvEscape).join(',');
    }),
  ];

  const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
