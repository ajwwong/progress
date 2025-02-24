import { Box, Paper, Text } from '@mantine/core';
import { format, isToday, differenceInMinutes, parse } from 'date-fns';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { AppointmentItem } from './AppointmentItem';
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

export function DayCalendar({ selectedDate, appointments, onAppointmentClick }: DayCalendarProps) {
  const { active } = useDndContext();

  const dayAppointments = appointments.filter(apt => 
    apt.start.getDate() === selectedDate.getDate() &&
    apt.start.getMonth() === selectedDate.getMonth() &&
    apt.start.getFullYear() === selectedDate.getFullYear()
  );

  return (
    <Box style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
      <Paper 
        withBorder 
        style={{ 
          flex: 1, 
          display: 'grid', 
          gridTemplateColumns: '80px 1fr', 
          overflow: 'auto',
          height: '100%'
        }}
      >
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
        <Box style={{ position: 'relative', backgroundColor: 'white', overflow: 'auto' }}>
          {timeSlots.map((time) => {
            const { setNodeRef } = useDroppable({
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
                style={{
                  height: `${SLOT_HEIGHT}px`,
                  borderBottom: '1px solid var(--mantine-color-gray-2)',
                }}
              />
            );
          })}
          {dayAppointments.map((apt) => {
            const startMinutes = apt.start.getHours() * 60 + apt.start.getMinutes() - (START_HOUR * 60);
            const duration = differenceInMinutes(apt.end, apt.start);
            const topPosition = (startMinutes / 30) * SLOT_HEIGHT;
            const height = (duration / 30) * SLOT_HEIGHT;

            return (
              <AppointmentItem
                key={apt.id}
                appointment={apt}
                onClick={() => onAppointmentClick(apt)}
                variant="week"
                style={{
                  position: 'absolute',
                  top: `${topPosition}px`,
                  height: `${height}px`,
                }}
              />
            );
          })}
        </Box>
      </Paper>
    </Box>
  );
}