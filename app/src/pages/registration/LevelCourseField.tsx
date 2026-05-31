import { Alert, AlertTitle, MenuItem, Stack, TextField } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { LevelOption } from './types';

const PLACEMENT_RULES: { tier: string; rule: string }[] = [
  { tier: 'Basic (10–12)', rule: 'Ages 10–12 (required even if attended before).' },
  { tier: 'Basic (Teens)', rule: 'Age 13+ who have not attended JBS before.' },
  { tier: 'Advanced', rule: 'Age 13+ who completed Basic.' },
  { tier: 'Teens Masterclass', rule: 'Age 13+ who completed Advanced.' },
];

/** Visible guidance, shown at the top of the form, on which tier a child can apply for. */
export function TierPlacementGuide() {
  return (
    <Alert severity="info" icon={<InfoOutlinedIcon />}>
      <AlertTitle>Which tier can my child apply for?</AlertTitle>
      <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
        {PLACEMENT_RULES.map((p) => (
          <li key={p.tier}>
            <strong>{p.tier}:</strong> {p.rule}
          </li>
        ))}
      </Stack>
    </Alert>
  );
}

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
  label = 'Tier / course',
}: Props) {
  return (
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
  );
}
