import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { Dayjs } from 'dayjs';

type Props = {
  label: string;
  value: Dayjs | null;
  onChange: (value: Dayjs | null) => void;
  minDate?: Dayjs;
  maxDate?: Dayjs;
  size?: 'small' | 'medium';
};

export function DatePickerField({ label, value, onChange, minDate, maxDate, size = 'medium' }: Props) {
  return (
    <DatePicker
      label={label}
      value={value}
      onChange={onChange}
      minDate={minDate}
      maxDate={maxDate}
      format="DD/MM/YYYY"
      slotProps={{
        textField: {
          fullWidth: true,
          size,
        },
        field: { clearable: true },
      }}
    />
  );
}
