import { IconButton, MenuItem, Stack, TextField, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { LevelOption } from './types';

const PLACEMENT_HELP = (
  <>
    <strong>Basic (10–12):</strong> Ages 10–12 (required even if attended before).
    <br />
    <strong>Basic (Teens):</strong> Age 13+ who have not attended JBS before.
    <br />
    <strong>Advanced:</strong> Age 13+ who completed Basic.
    <br />
    <strong>Teens Masterclass:</strong> Age 13+ who completed Advanced.
  </>
);

type Props = {
  levels: LevelOption[];
  value: number | '';
  onChange: (levelId: number) => void;
  error?: string;
  disabled?: boolean;
  label?: string;
};

export function LevelCourseField({
  levels,
  value,
  onChange,
  error,
  disabled,
  label = 'Level / course',
}: Props) {
  return (
    <Stack direction="row" alignItems="flex-start" spacing={0.5}>
      <TextField
        select
        label={label}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        error={Boolean(error)}
        helperText={error}
        required
        fullWidth
        disabled={disabled}
      >
        {levels.map((l) => (
          <MenuItem key={l.id} value={l.id}>
            {l.name}
          </MenuItem>
        ))}
      </TextField>
      <Tooltip title={PLACEMENT_HELP} placement="left">
        <IconButton size="small" aria-label="Course placement guidelines" sx={{ mt: 1 }}>
          <InfoOutlinedIcon color="primary" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
