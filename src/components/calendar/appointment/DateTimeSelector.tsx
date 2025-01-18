import { Group, Stack, TextInput } from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import { DatePickerInput } from '@mantine/dates';

interface DateTimeSelectorProps {
  date: Date | null;
  startTime: string | null;
  endTime: string | null;
  defaultInterval: number;
  onDateChange: (date: Date | null) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onIntervalChange: (minutes: number) => void;
}

export function DateTimeSelector({
  date,
  startTime,
  endTime,
  defaultInterval,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onIntervalChange,
}: DateTimeSelectorProps) {
  return (
    <Stack gap="md">
      <DatePickerInput
        label="Date"
        value={date}
        firstDayOfWeek={0}
        onChange={onDateChange}
        required
      />
      <Group grow align="flex-end">
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
        <TextInput
          label="Duration (min)"
          value={defaultInterval}
          onChange={(e) => {
            const value = parseInt(e.currentTarget.value);
            if (!isNaN(value) && value > 0 && value <= 480) {
              onIntervalChange(value);
            }
          }}
          w={100}
        />
      </Group>
    </Stack>
  );
}