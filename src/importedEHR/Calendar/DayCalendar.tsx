import { Box, Group, Paper, Text, UnstyledButton } from '@mantine/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, format, setHours, setMinutes, isToday, differenceInMinutes, subDays, parse } from 'date-fns';
import { useDndContext, useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Appointment } from '../../types/calendar';

interface DayCalendarProps {
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

function AppointmentItem({ appointment, onClick }: { appointment: Appointment; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: appointment,
  });

  const startMinutesSinceMidnight = appointment.start.getHours() * 60 + appointment.start.getMinutes();
  const startMinutesSinceStartHour = startMinutesSinceMidnight - (START_HOUR * 60);
  const topPosition = (startMinutesSinceStartHour / 30) * SLOT_HEIGHT;

  const durationInMinutes = differenceInMinutes(appointment.end, appointment.start);
  const heightInPixels = (durationInMinutes / 30) * SLOT_HEIGHT;

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: 1000,
  } : undefined;

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        ...style,
        position: 'absolute',
        top: `${topPosition}px`,
        left: '4px',
        right: '4px',
        height: `${heightInPixels}px`,
        backgroundColor: typeColors[appointment.type][0],
        color: typeColors[appointment.type][1],
        padding: '8px 12px',
        borderRadius: 4,
        cursor: 'grab',
        border: `1px solid ${typeColors[appointment.type][0]}`,
        transition: transform ? undefined : 'transform 0.2s ease',
        opacity: isDragging ? 0.8 : 1,
        '&:hover': {
          transform: isDragging ? undefined : 'scale(1.005)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        },
      }}
    >
      <Group gap={4} wrap="nowrap">
        <Text size="sm" fw={500}>
          {format(appointment.start, 'h:mm a')} - {format(appointment.end, 'h:mm a')}
        </Text>
      </Group>
      <Text size="sm" fw={500} mt={2}>
        {appointment.patientName}
      </Text>
      {appointment.title !== `${appointment.type} - ${appointment.patientName}` && (
        <Text size="xs" opacity={0.7} mt={2}>
          {appointment.title}
        </Text>
      )}
    </Box>
  );
}

export function DayCalendar({ selectedDate, onDateChange, appointments, onAppointmentClick }: DayCalendarProps) {
  const { active } = useDndContext();

  const handlePrevDay = () => onDateChange(subDays(selectedDate, 1));
  const handleNextDay = () => onDateChange(addDays(selectedDate, 1));
  const handleToday = () => onDateChange(new Date());

  const dayAppointments = appointments.filter(apt => 
    apt.start.getDate() === selectedDate.getDate() &&
    apt.start.getMonth() === selectedDate.getMonth() &&
    apt.start.getFullYear() === selectedDate.getFullYear()
  );

  return (
    <Box style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
      <Group justify="space-between" mb="md">
        <Group>
          <UnstyledButton onClick={handlePrevDay}>
            <ChevronLeft size={20} />
          </UnstyledButton>
          <Text fw={500} size="lg">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </Text>
          <UnstyledButton onClick={handleNextDay}>
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

      <Paper withBorder style={{ flex: 1, display: 'grid', gridTemplateColumns: '80px 1fr', overflow: 'hidden' }}>
        {/* Time column */}
        <Box style={{ borderRight: '1px solid var(--mantine-color-gray-2)' }}>
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

        {/* Appointments column */}
        <Box style={{ position: 'relative', backgroundColor: 'white' }}>
          {timeSlots.map((time) => {
            const { setNodeRef, isOver } = useDroppable({
              id: `${format(selectedDate, 'yyyy-MM-dd')}-${time}`,
              data: {
                date: selectedDate,
                time: time,
              },
            });

            return (
              <Box
                key={`${selectedDate.toISOString()}-${time}`}
                ref={setNodeRef}
                style={(theme) => ({
                  height: `${SLOT_HEIGHT}px`,
                  borderBottom: `1px solid ${theme.colors.gray[2]}`,
                  backgroundColor: isOver ? theme.colors.blue[0] : 'white',
                  transition: 'background-color 0.2s ease',
                })}
              />
            );
          })}
          {dayAppointments.map((apt) => (
            <AppointmentItem
              key={apt.id}
              appointment={apt}
              onClick={() => onAppointmentClick(apt)}
            />
          ))}
        </Box>
      </Paper>
    </Box>
  );
}