import { Paper, Text, Badge, Stack, Group, Box } from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { format } from 'date-fns';
import type { Appointment } from '../types/calendar';

interface MonthCalendarProps {
  value: Date;
  onChange: (date: Date) => void;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
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

function AppointmentItem({ appointment, onClick }: { appointment: Appointment; onClick: () => void }) {
  return (
    <Box 
      style={{ 
        cursor: 'pointer',
        '&:hover': {
          filter: 'brightness(0.95)',
        },
        transition: 'all 0.2s',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <Badge 
        color={typeColors[appointment.type]}
        variant="light"
        size="sm"
        fullWidth
        styles={{ root: { textAlign: 'left' } }}
      >
        <Group gap="xs" wrap="nowrap">
          <Text size="xs" fw={500}>{format(appointment.start, 'HH:mm')}</Text>
          <Text size="xs" truncate>{appointment.patientName}</Text>
        </Group>
      </Badge>
    </Box>
  );
}

export function MonthCalendar({ value, onChange, appointments, onAppointmentClick }: MonthCalendarProps) {
  const renderDay = (date: Date) => {
    const dayAppointments = appointments.filter(
      (apt) =>
        apt.start.getDate() === date.getDate() &&
        apt.start.getMonth() === date.getMonth() &&
        apt.start.getFullYear() === date.getFullYear()
    );

    const displayAppointments = dayAppointments.slice(0, 3);

    return (
      <Stack gap={4} p={4} h={120} style={{ 
        '&:hover': { backgroundColor: 'var(--mantine-color-gray-0)' },
        cursor: 'pointer'
      }}>
        <Text 
          size="sm" 
          ta="center"
          style={{
            color: date.getDate() === new Date().getDate() ? 'var(--mantine-color-blue-6)' : undefined,
            fontWeight: date.getDate() === new Date().getDate() ? 500 : undefined,
          }}
        >
          {format(date, 'd')}
        </Text>
        <Stack gap={4}>
          {displayAppointments.map((appointment) => (
            <AppointmentItem 
              key={appointment.id} 
              appointment={appointment} 
              onClick={() => onAppointmentClick(appointment)}
            />
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