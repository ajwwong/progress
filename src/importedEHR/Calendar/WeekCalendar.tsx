import { Box, Group, Paper, Text, UnstyledButton } from '@mantine/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, format, startOfWeek, isSameDay, addWeeks, subWeeks, isToday, differenceInMinutes, setHours, setMinutes, parse, roundToNearestMinutes } from 'date-fns';
import { useDndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { CalendarContext } from '../../App';
import { useContext } from 'react';
import type { Appointment } from '../../types/calendar';

interface WeekCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
}

const SLOT_HEIGHT = 40;
const START_HOUR = 6;
const END_HOUR = 20;

const timeSlots = Array.from({ length: (END_HOUR - START_HOUR) * 2 }, (_, i) => {
  const hour = Math.floor(i / 2) + START_HOUR;
  const minutes = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
});

const typeColors = {
  checkup: ['var(--mantine-color-cyan-0)', 'var(--mantine-color-cyan-9)'],
  surgery: ['var(--mantine-color-red-0)', 'var(--mantine-color-red-9)'],
  consultation: ['var(--mantine-color-yellow-0)', 'var(--mantine-color-yellow-9)'],
  followup: ['var(--mantine-color-teal-0)', 'var(--mantine-color-teal-9)'],
} as const;

function getTimeFromYPosition(y: number): string {
  const slotIndex = Math.floor(y / SLOT_HEIGHT);
  const hour = Math.floor(slotIndex / 2) + START_HOUR;
  const minutes = slotIndex % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
}

function AppointmentItem({ appointment, onClick }: { appointment: Appointment; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: appointment.id,
    data: appointment,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 1000,
  } : undefined;

  const startMinutesSinceMidnight = appointment.start.getHours() * 60 + appointment.start.getMinutes();
  const startMinutesSinceStartHour = startMinutesSinceMidnight - (START_HOUR * 60);
  const topPosition = (startMinutesSinceStartHour / 30) * SLOT_HEIGHT;

  const durationInMinutes = differenceInMinutes(appointment.end, appointment.start);
  const heightInPixels = (durationInMinutes / 30) * SLOT_HEIGHT;

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      style={{
        ...style,
        position: 'absolute',
        top: `${topPosition}px`,
        left: '4px',
        right: '4px',
        height: `${heightInPixels}px`,
        backgroundColor: typeColors[appointment.type][0],
        color: typeColors[appointment.type][1],
        padding: '4px 8px',
        borderRadius: 4,
        cursor: 'grab',
        border: `1px solid ${typeColors[appointment.type][0]}`,
        zIndex: transform ? 1000 : 1,
        '&:hover': {
          filter: 'brightness(0.95)',
        },
      }}
    >
      <Group gap={4} wrap="nowrap">
        <Text size="xs" fw={500}>
          {format(appointment.start, 'h:mm a')}
        </Text>
        <Text size="xs" fw={500} truncate>
          {appointment.patientName}
        </Text>
      </Group>
      {appointment.title !== `${appointment.type} - ${appointment.patientName}` && (
        <Text size="xs" opacity={0.7} truncate>
          {appointment.title}
        </Text>
      )}
    </Box>
  );
}

export function WeekCalendar({ selectedDate, onDateChange, appointments, onAppointmentClick }: WeekCalendarProps) {
  const { active } = useDndContext();
  const { setShowNewAppointmentModal } = useContext(CalendarContext);
  const startDate = startOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  const handlePrevWeek = () => onDateChange(subWeeks(selectedDate, 1));
  const handleNextWeek = () => onDateChange(addWeeks(selectedDate, 1));
  const handleToday = () => onDateChange(new Date());

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => isSameDay(apt.start, date));
  };

  const handleCellClick = (date: Date, time: string) => (e: React.MouseEvent) => {
    // Only handle clicks on the cell itself, not on appointments
    if ((e.target as HTMLElement).closest('.appointment-item')) {
      return;
    }

    const [hours, minutes] = time.split(':').map(Number);
    const selectedDateTime = new Date(date);
    selectedDateTime.setHours(hours, minutes);

    // Round to nearest 30 minutes
    const roundedDateTime = roundToNearestMinutes(selectedDateTime, { nearestTo: 30 });

    // Store both date and time in localStorage
    localStorage.setItem('selectedAppointmentDate', roundedDateTime.toISOString());
    setShowNewAppointmentModal(true);
  };

  return (
    <Box style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
      <Group justify="space-between" mb="md">
        <Group>
          <UnstyledButton onClick={handlePrevWeek}>
            <ChevronLeft size={20} />
          </UnstyledButton>
          <Text fw={500}>
            {format(startDate, 'MMM d')} - {format(addDays(startDate, 6), 'MMM d, yyyy')}
          </Text>
          <UnstyledButton onClick={handleNextWeek}>
            <ChevronRight size={20} />
          </UnstyledButton>
        </Group>
        <UnstyledButton 
          onClick={handleToday}
          style={(theme) => ({
            padding: '4px 12px',
            borderRadius: theme.radius.sm,
            backgroundColor: theme.colors.blue[0],
            color: theme.colors.blue[9],
            '&:hover': {
              backgroundColor: theme.colors.blue[1],
            }
          })}
        >
          Today
        </UnstyledButton>
      </Group>

      <Paper withBorder style={{ flex: 1, display: 'grid', gridTemplateColumns: '60px 1fr', overflow: 'hidden' }}>
        {/* Time column */}
        <Box style={{ borderRight: '1px solid var(--mantine-color-gray-2)' }}>
          <Box h={50} /> {/* Header spacer */}
          <Box style={{ height: 'calc(100% - 50px)', display: 'flex', flexDirection: 'column' }}>
            {timeSlots.map((time) => (
              <Box 
                key={time}
                style={{ 
                  height: `${SLOT_HEIGHT}px`,
                  padding: '8px 8px 8px 0',
                  textAlign: 'right',
                  borderBottom: '1px solid var(--mantine-color-gray-2)',
                }}
              >
                <Text size="xs" c="dimmed">
                  {format(parse(time, 'HH:mm', new Date()), 'h a')}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Days columns */}
        <Box style={{ overflow: 'auto' }}>
          <Box style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)',
            minWidth: '100%',
          }}>
            {/* Header row */}
            {weekDays.map((day) => (
              <Box 
                key={day.toISOString()} 
                h={50}
                p={8}
                style={(theme) => ({
                  borderBottom: `1px solid ${theme.colors.gray[2]}`,
                  borderLeft: `1px solid ${theme.colors.gray[2]}`,
                  backgroundColor: isToday(day) ? theme.colors.blue[0] : theme.colors.gray[0],
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                })}
              >
                <Text size="sm" fw={500} ta="center" c={isToday(day) ? 'blue' : undefined}>
                  {format(day, 'EEE')}
                </Text>
                <Text size="xs" c={isToday(day) ? 'blue' : 'dimmed'} ta="center">
                  {format(day, 'd')}
                </Text>
              </Box>
            ))}

            {/* Time slots */}
            {weekDays.map((day) => (
              <Box 
                key={day.toISOString()}
                style={{ 
                  position: 'relative',
                  backgroundColor: 'white',
                }}
              >
                {timeSlots.map((time) => {
                  const { setNodeRef } = useDroppable({
                    id: `${format(day, 'yyyy-MM-dd')}-${time}`,
                    data: {
                      date: day,
                      time: time,
                    },
                  });

                  return (
                    <Box
                      key={`${day.toISOString()}-${time}`}
                      ref={setNodeRef}
                      onClick={handleCellClick(day, time)}
                      style={(theme) => ({
                        height: `${SLOT_HEIGHT}px`,
                        borderBottom: `1px solid ${theme.colors.gray[2]}`,
                        borderLeft: `1px solid ${theme.colors.gray[2]}`,
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: theme.colors.gray[0],
                        },
                      })}
                    />
                  );
                })}
                {getAppointmentsForDate(day).map((apt) => (
                  <AppointmentItem
                    key={apt.id}
                    appointment={apt}
                    onClick={() => onAppointmentClick(apt)}
                  />
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}