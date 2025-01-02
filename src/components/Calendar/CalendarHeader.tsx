import { Group, SegmentedControl, TextInput, Button, Text } from '@mantine/core';
import { Calendar as CalendarIcon, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';

interface CalendarHeaderProps {
  selectedDate: Date;
  view: string;
  onViewChange: (view: string) => void;
  onNewAppointment: () => void;
}

export function CalendarHeader({ selectedDate, view, onViewChange, onNewAppointment }: CalendarHeaderProps) {
  return (
    <Group justify="space-between" align="center">
      <Group>
        <CalendarIcon size={24} color="var(--mantine-color-blue-6)" />
        <Text 
          size="xl" 
          fw={600}
          style={(theme) => ({
            letterSpacing: '-0.3px',
            color: theme.colors.gray[8],
          })}
        >
          {format(selectedDate, 'MMMM yyyy')}
        </Text>
      </Group>
      <Group>
        <TextInput
          placeholder="Search appointments..."
          leftSection={<Search size={16} />}
          style={{ width: 250 }}
        />
        <SegmentedControl
          value={view}
          onChange={onViewChange}
          data={[
            { label: 'Day', value: 'day' },
            { label: 'Week', value: 'week' },
            { label: 'Month', value: 'month' },
          ]}
        />
        <Button 
          leftSection={<Plus size={16} />}
          variant="filled"
          color="blue"
          onClick={onNewAppointment}
        >
          New Appointment
        </Button>
      </Group>
    </Group>
  );
}