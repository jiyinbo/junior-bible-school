import { Alert, AlertTitle, MenuItem, Stack, TextField } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { LevelOption } from './types';

const PLACEMENT_RULES: { tier: string; rule: string }[] = [
  {
    tier: 'Basic (10-12)',
    rule: 'All children aged 10-12 have to register for this class irrespective of whether they have attended JBS before',
  },
  {
    tier: 'Basic (Teens)',
    rule: 'Teenagers (13 - 15 years) who have not attended JBS before',
  },
  {
    tier: 'Advanced',
    rule: "Teenagers who have attended the Basic (Teens) Class or are 15 years and above and haven't attended JBS before.",
  },
  {
    tier: 'Teens Masterclass',
    rule: 'Teenagers (15 years and above) who have attended the Advanced Class.',
  },
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
  onChange: (levelId: number | '') => void;
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
  label = 'Tier',
}: Props) {
  return (
    <TextField
      select
      label={label}
      value={value === '' ? '' : String(value)}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === '' ? '' : Number(raw));
      }}
      error={Boolean(error)}
      helperText={error}
      required
      fullWidth
      disabled={disabled}
      InputLabelProps={{ shrink: true }}
      SelectProps={{ displayEmpty: true }}
    >
      <MenuItem value="" disabled>
        Select a tier
      </MenuItem>
      {levels.map((l) => (
        <MenuItem key={l.id} value={String(l.id)}>
          {l.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
