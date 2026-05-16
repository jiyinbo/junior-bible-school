import dayjs, { type Dayjs } from 'dayjs';

export type ModuleScheduleInput = {
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
};

export function parseScheduleDate(iso: string | null | undefined): Dayjs | null {
  if (!iso) return null;
  const d = dayjs(iso);
  return d.isValid() ? d : null;
}

export function parseScheduleTime(hi: string | null | undefined): Dayjs | null {
  if (!hi) return null;
  const d = dayjs(`1970-01-01T${hi.length === 5 ? `${hi}:00` : hi}`);
  return d.isValid() ? d : null;
}

export function scheduleTimeToApi(value: Dayjs | null): string | null {
  if (!value?.isValid()) return null;
  return value.format('HH:mm');
}

export function scheduleToApi(state: {
  scheduled_date: Dayjs | null;
  scheduled_start_time: Dayjs | null;
  scheduled_end_time: Dayjs | null;
}): ModuleScheduleInput {
  return {
    scheduled_date: state.scheduled_date?.isValid() ? state.scheduled_date.format('YYYY-MM-DD') : null,
    scheduled_start_time: scheduleTimeToApi(state.scheduled_start_time),
    scheduled_end_time: scheduleTimeToApi(state.scheduled_end_time),
  };
}

export function scheduleFromApi(data: ModuleScheduleInput) {
  return {
    scheduled_date: parseScheduleDate(data.scheduled_date),
    scheduled_start_time: parseScheduleTime(data.scheduled_start_time),
    scheduled_end_time: parseScheduleTime(data.scheduled_end_time),
  };
}
