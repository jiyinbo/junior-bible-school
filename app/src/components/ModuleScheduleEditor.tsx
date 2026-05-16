import { useEffect, useState } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import { IconButton, Stack, Tooltip, Typography } from '@mui/material';
import type { Dayjs } from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePickerField } from './TimePickerField';
import { apiJson, parseApiError } from '../api/http';
import { toastSuccess } from '../feedback/toast';
import { scheduleFromApi, scheduleToApi, type ModuleScheduleInput } from '../utils/moduleSchedule';

type Props = {
  moduleId: number;
  initial: ModuleScheduleInput;
  programmeMin?: Dayjs;
  programmeMax?: Dayjs;
  onSaved?: () => void;
  /** Fill parent width (e.g. table column). */
  fullWidth?: boolean;
};

export function ModuleScheduleEditor({
  moduleId,
  initial,
  programmeMin,
  programmeMax,
  onSaved,
  fullWidth = false,
}: Props) {
  const [state, setState] = useState(() => scheduleFromApi(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setState(scheduleFromApi(initial));
  }, [moduleId, initial.scheduled_date, initial.scheduled_start_time, initial.scheduled_end_time]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiJson(`/api/v1/admin/modules/${moduleId}/schedule`, {
        method: 'PATCH',
        json: scheduleToApi(state),
      });
      toastSuccess('Timetable slot saved.');
      onSaved?.();
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const saveButton = (
    <Tooltip title={saving ? 'Saving…' : 'Save timetable'}>
      <span>
        <IconButton
          size="small"
          color="primary"
          onClick={() => void save()}
          disabled={saving}
          aria-label="Save timetable"
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <CheckIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );

  return (
    <Stack
      spacing={0.5}
      sx={{
        width: fullWidth ? '100%' : 168,
        maxWidth: fullWidth ? '100%' : 168,
      }}
    >
      <Stack direction="row" spacing={0.5} alignItems="flex-end">
        <Stack spacing={1.25} sx={{ flex: 1, minWidth: 0 }}>
          <DatePicker
            label="Date"
            value={state.scheduled_date}
            onChange={(v) => setState((s) => ({ ...s, scheduled_date: v }))}
            minDate={programmeMin}
            maxDate={programmeMax}
            format="DD/MM/YYYY"
            disabled={saving}
            slotProps={{
              textField: { size: 'small', fullWidth: true },
              field: { clearable: true },
            }}
          />
          <TimePickerField
            label="Start"
            value={state.scheduled_start_time}
            onChange={(v) => setState((s) => ({ ...s, scheduled_start_time: v }))}
            disabled={saving}
          />
          <TimePickerField
            label="End"
            value={state.scheduled_end_time}
            onChange={(v) => setState((s) => ({ ...s, scheduled_end_time: v }))}
            disabled={saving}
          />
        </Stack>
        {saveButton}
      </Stack>
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Stack>
  );
}
