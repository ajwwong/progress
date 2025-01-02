import { Paper, Text, Badge, Stack, Group, Box } from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { format } from 'date-fns';
import type { Appointment } from '../../types/calendar';

interface MonthCalendarProps {
  value: Date;
  onChange: (date: Date) => void;
  appointments: Appointment[];
}

const typeColors = {
  checkup: 'cyan',
  surgery: 'red',
  consultation: 'violet',
  followup: 'green',
} as const;

const statusColors = {
  scheduled: 'blue',
  completed: 'green',
  cancelled: 'red',
} as const;

function AppointmentItem({ appointment }: { appointment: Appointment }) {
  return (
    <Box 
      className="cursor-pointer hover:brightness-95 transition-all"
      onClick={(e) => {
        e.stopPropagation();
        // Handle appointment click
      }}
    >
      <Badge 
        color={typeColors[appointment.type]}
        variant="light"
        size="sm"
        fullWidth
        className="text-left"
      >
        <Group gap="xs" wrap="nowrap">
          <Text size="xs" fw={500}>{format(appointment.start, 'HH:mm')}</Text>
          <Text size="xs" truncate>{appointment.patientName}</Text>
        </Group>
      </Badge>
    </Box>
  );
}

export function MonthCalendar({ value, onChange, appointments }: MonthCalendarProps) {
  const renderDay = (date: Date) => {
    const dayAppointments = appointments.filter(
      (apt) =>
        apt.start.getDate() === date.getDate() &&
        apt.start.getMonth() === date.getMonth() &&
        apt.start.getFullYear() === date.getFullYear()
    );

    return (
      <Stack gap={4} p={4} h={120} className="hover:bg-gray-50 cursor-pointer">
        <Text 
          size="sm" 
          ta="center"
          className={date.getDate() === new Date().getDate() ? 'text-blue-600 font-bold' : ''}
        >
          {format(date, 'd')}
        </Text>
        <Stack gap={4}>
          {dayAppointments.map((appointment) => (
            <AppointmentItem key={appointment.id} appointment={appointment} />
          ))}
          {dayAppointments.length > 3 && (
            <Text size="xs" c="dimmed" ta="center">
              +{dayAppointments.length - 3} more
            </Text>
          )}
        </Stack>
      </Stack>
    );
  };

  return (
    <MonthPickerInput
      value={value}
      onChange={(date) => date && onChange(date)}
      valueFormat="MMMM YYYY"
      renderDay={renderDay}
      size="xl"
      styles={{
        calendar: {
          minHeight: '700px',
        },
        calendarHeader: {
          marginBottom: '1rem',
        },
        day: {
          borderRadius: '4px',
        },
      }}
    />
  );
}