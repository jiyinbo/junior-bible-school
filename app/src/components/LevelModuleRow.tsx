import type { ReactNode } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material';
import { InlineFieldSave } from './InlineFieldSave';

type TeacherOption = { id: number; name: string };

export type LevelModuleRowData = {
  id: number;
  name: string;
  code: string | null;
  test: { id: number; status: string } | null;
  assigned_teacher: { id: number; name: string } | null;
};

type Props = {
  mod: LevelModuleRowData;
  layout: 'table' | 'card';
  teacherOptions: TeacherOption[];
  assigningModuleId: number | null;
  onUpdateModule: (moduleId: number, patch: { name?: string; code?: string }) => void | Promise<void>;
  onAssignTeacher: (moduleId: number, teacherId: number) => void | Promise<void>;
  testButton: ReactNode;
  readOnly?: boolean;
};

export const MODULE_TABLE_COL_WIDTH = '33%';

function TeacherSelect({
  mod,
  teacherOptions,
  assigningModuleId,
  onAssignTeacher,
}: Pick<Props, 'mod' | 'teacherOptions' | 'assigningModuleId' | 'onAssignTeacher'>) {
  return (
    <FormControl size="small" fullWidth disabled={assigningModuleId === mod.id}>
      <InputLabel id={`teacher-${mod.id}`}>Teacher</InputLabel>
      <Select
        labelId={`teacher-${mod.id}`}
        label="Teacher"
        value={mod.assigned_teacher?.id ?? ''}
        displayEmpty
        renderValue={(selected) => {
          if (!selected) {
            return (
              <Typography variant="body2" color="text.secondary" noWrap>
                Unassigned
              </Typography>
            );
          }
          const teacher = teacherOptions.find((u) => u.id === selected);
          return teacher?.name ?? mod.assigned_teacher?.name ?? '';
        }}
        onChange={(e) => {
          const v = e.target.value;
          if (v !== '') void onAssignTeacher(mod.id, Number(v));
        }}
      >
        {teacherOptions.map((u) => (
          <MenuItem key={u.id} value={u.id}>
            {u.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export function LevelModuleRow({
  mod,
  layout,
  teacherOptions,
  assigningModuleId,
  onUpdateModule,
  onAssignTeacher,
  testButton,
  readOnly = false,
}: Props) {
  const moduleName = readOnly ? (
    <Box>
      <Typography fontWeight={600}>{mod.name}</Typography>
      {mod.code && (
        <Typography variant="caption" color="text.secondary">
          {mod.code}
        </Typography>
      )}
    </Box>
  ) : null;

  const teacher = readOnly ? (
    <Typography variant="body2" color={mod.assigned_teacher ? 'text.primary' : 'text.secondary'}>
      {mod.assigned_teacher?.name ?? 'Unassigned'}
    </Typography>
  ) : (
    <TeacherSelect
      mod={mod}
      teacherOptions={teacherOptions}
      assigningModuleId={assigningModuleId}
      onAssignTeacher={onAssignTeacher}
    />
  );

  if (layout === 'card') {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          {readOnly ? (
            moduleName
          ) : (
            <>
              <InlineFieldSave
                label="Module"
                value={mod.name}
                onSave={(name) => onUpdateModule(mod.id, { name })}
                fullWidth
              />
              <InlineFieldSave
                label="Short code"
                value={mod.code ?? ''}
                onSave={(code) => onUpdateModule(mod.id, { code })}
                fullWidth
                allowEmpty
              />
            </>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-end' }}>
            <Box sx={{ flexShrink: 0 }}>{testButton}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>{teacher}</Box>
          </Stack>
        </Stack>
      </Paper>
    );
  }

  const colSx = { width: MODULE_TABLE_COL_WIDTH, verticalAlign: 'top' as const };

  return (
    <TableRow hover>
      <TableCell sx={colSx}>
        {readOnly ? (
          moduleName
        ) : (
          <Stack spacing={1}>
            <InlineFieldSave
              value={mod.name}
              onSave={(name) => onUpdateModule(mod.id, { name })}
              fullWidth
            />
            <InlineFieldSave
              label="Short code"
              value={mod.code ?? ''}
              onSave={(code) => onUpdateModule(mod.id, { code })}
              fullWidth
              allowEmpty
            />
          </Stack>
        )}
      </TableCell>
      <TableCell sx={{ ...colSx, whiteSpace: 'nowrap' }}>{testButton}</TableCell>
      <TableCell sx={colSx}>{teacher}</TableCell>
    </TableRow>
  );
}
