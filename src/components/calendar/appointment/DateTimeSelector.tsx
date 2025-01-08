import { Group, Stack } from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import { DatePickerInput } from '@mantine/dates';

interface DateTimeSelectorProps {
  date: Date | null;
  startTime: string | null;
  endTime: string | null;
  onDateChange: (date: Date | null) => void;
  onStartTimeChange: (time: string | null) => void;
  onEndTimeChange: (time: string | null) => void;
}

export function DateTimeSelector({
  date,
  startTime,
  endTime,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
}: DateTimeSelectorProps) {
  return (
    <Stack gap="md">
      <DatePickerInput
        label="Date"
        value={date}
        onChange={onDateChange}
        required
      />

      <Group grow>
        <TimeInput
          label="Start Time"
          value={startTime || ''}
          onChange={(e) => onStartTimeChange(e.currentTarget.value)}
          required
        />
        <TimeInput
          label="End Time"
          value={endTime || ''}
          onChange={(e) => onEndTimeChange(e.currentTarget.value)}
          required
        />
      </Group>
    </Stack>
  );
}