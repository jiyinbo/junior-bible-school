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
import type { Dayjs } from 'dayjs';
import { InlineFieldSave } from './InlineFieldSave';
import { ModuleScheduleEditor } from './ModuleScheduleEditor';
import type { ModuleScheduleInput } from '../utils/moduleSchedule';

type TeacherOption = { id: number; name: string };

export type LevelModuleRowData = {
  id: number;
  name: string;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  test: { id: number; status: string } | null;
  assigned_teacher: { id: number; name: string } | null;
};

type Props = {
  mod: LevelModuleRowData;
  layout: 'table' | 'card';
  programmeMin?: Dayjs;
  programmeMax?: Dayjs;
  teacherOptions: TeacherOption[];
  assigningModuleId: number | null;
  onUpdateName: (moduleId: number, name: string) => void | Promise<void>;
  onAssignTeacher: (moduleId: number, teacherId: number) => void | Promise<void>;
  onScheduleSaved: () => void;
  testButton: ReactNode;
};

function scheduleInitial(mod: LevelModuleRowData): ModuleScheduleInput {
  return {
    scheduled_date: mod.scheduled_date,
    scheduled_start_time: mod.scheduled_start_time,
    scheduled_end_time: mod.scheduled_end_time,
  };
}

export const MODULE_TABLE_COL_WIDTH = '25%';

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
  programmeMin,
  programmeMax,
  teacherOptions,
  assigningModuleId,
  onUpdateName,
  onAssignTeacher,
  onScheduleSaved,
  testButton,
}: Props) {
  const schedule = (
    <ModuleScheduleEditor
      moduleId={mod.id}
      initial={scheduleInitial(mod)}
      programmeMin={programmeMin}
      programmeMax={programmeMax}
      onSaved={onScheduleSaved}
      fullWidth={layout === 'table'}
    />
  );

  if (layout === 'card') {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <InlineFieldSave
            label="Module"
            value={mod.name}
            onSave={(name) => onUpdateName(mod.id, name)}
            fullWidth
          />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
              Schedule
            </Typography>
            {schedule}
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-end' }}>
            <Box sx={{ flexShrink: 0 }}>{testButton}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <TeacherSelect
                mod={mod}
                teacherOptions={teacherOptions}
                assigningModuleId={assigningModuleId}
                onAssignTeacher={onAssignTeacher}
              />
            </Box>
          </Stack>
        </Stack>
      </Paper>
    );
  }

  const colSx = { width: MODULE_TABLE_COL_WIDTH, verticalAlign: 'top' as const };

  return (
    <TableRow hover>
      <TableCell sx={colSx}>
        <InlineFieldSave
          value={mod.name}
          onSave={(name) => onUpdateName(mod.id, name)}
          fullWidth
        />
      </TableCell>
      <TableCell sx={colSx}>{schedule}</TableCell>
      <TableCell sx={{ ...colSx, whiteSpace: 'nowrap' }}>{testButton}</TableCell>
      <TableCell sx={colSx}>
        <TeacherSelect
          mod={mod}
          teacherOptions={teacherOptions}
          assigningModuleId={assigningModuleId}
          onAssignTeacher={onAssignTeacher}
        />
      </TableCell>
    </TableRow>
  );
}
