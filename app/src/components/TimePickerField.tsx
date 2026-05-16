import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import type { Dayjs } from 'dayjs';

type Props = {
  label: string;
  value: Dayjs | null;
  onChange: (value: Dayjs | null) => void;
  disabled?: boolean;
};

export function TimePickerField({ label, value, onChange, disabled }: Props) {
  return (
    <TimePicker
      label={label}
      value={value}
      onChange={onChange}
      disabled={disabled}
      ampm={false}
      format="HH:mm"
      slotProps={{
        textField: {
          size: 'small',
          fullWidth: true,
          sx: {
            '& .MuiInputBase-input': {
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.02em',
            },
          },
        },
        field: { clearable: true },
      }}
    />
  );
}
