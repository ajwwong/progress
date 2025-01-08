import { Stack, Group, Select, Text, SegmentedControl, Paper } from '@mantine/core';

interface RecurringOptionsProps {
  frequency: string;
  occurrences: number;
  selectedDays: string[];
  onFrequencyChange: (value: string) => void;
  onOccurrencesChange: (value: number) => void;
  onSelectedDaysChange: (value: string[]) => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => ({
  value: index.toString(),
  label: day
}));

const FREQUENCY_OPTIONS = Array.from({ length: 8 }, (_, i) => ({
  value: (i + 1).toString(),
  label: (i + 1).toString()
}));

const OCCURRENCE_OPTIONS = Array.from({ length: 52 }, (_, i) => ({
  value: (i + 1).toString(),
  label: (i + 1).toString()
}));

export function RecurringOptions({
  frequency,
  occurrences,
  selectedDays,
  onFrequencyChange,
  onOccurrencesChange,
  onSelectedDaysChange,
}: RecurringOptionsProps) {
  const interval = frequency.startsWith('every') ? frequency.split('-')[1] : '1';
  const period = frequency.includes('month') ? 'month' : 'week';

  const handleIntervalChange = (value: string | null) => {
    if (!value) return;
    const newFrequency = `every-${value}-${period}s`;
    onFrequencyChange(newFrequency);
  };

  const handlePeriodChange = (value: string | null) => {
    if (!value) return;
    const newFrequency = `every-${interval}-${value}s`;
    onFrequencyChange(newFrequency);
  };

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack spacing="lg">
        <Group spacing="xs">
          <Text size="sm" w={80}>Every</Text>
          <Select 
            data={FREQUENCY_OPTIONS}
            value={interval}
            onChange={handleIntervalChange}
            styles={{ input: { width: 80 } }}
            size="sm"
          />
          <Select
            data={[
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
            value={period}
            onChange={handlePeriodChange}
            styles={{ input: { width: 100 } }}
            size="sm"
          />
        </Group>

        
        <Group spacing="xs">
          <Text size="sm" w={80}>End after</Text>
          <Select
            data={OCCURRENCE_OPTIONS}
            value={occurrences.toString()}
            onChange={(value) => onOccurrencesChange(parseInt(value || '1', 10))}
            styles={{ input: { width: 80 } }}
            size="sm"
          />
          <Text size="sm" color="dimmed">sessions</Text>
        </Group>
      </Stack>
    </Paper>
  );
}