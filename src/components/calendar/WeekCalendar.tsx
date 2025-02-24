import { Box, Paper, Text } from '@mantine/core';
import { format, startOfWeek, isSameDay, isToday, differenceInMinutes, parse, addDays } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { AppointmentItem } from './AppointmentItem';
import type { Appointment } from '../../types/calendar';

interface WeekCalendarProps {
  selectedDate: Date;
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

function TimeColumn() {
  return (
    <Box style={{ width: '60px', borderRight: '1px solid var(--mantine-color-gray-2)', zIndex: 1 }}>
      <Box h={50} /> {/* Header spacer */}
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
  );
}

function DayColumn({ 
  day, 
  appointments, 
  onAppointmentClick 
}: { 
  day: Date; 
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
}) {
  return (
    <Box style={{ 
      flex: 1, 
      position: 'relative', 
      minWidth: 0,
      borderLeft: '1px solid var(--mantine-color-gray-2)',
      zIndex: 0
    }}>
      <Box 
        h={50} 
        p={8}
        style={{
          borderBottom: '1px solid var(--mantine-color-gray-2)',
          backgroundColor: isToday(day) ? 'var(--mantine-color-blue-0)' : 'var(--mantine-color-gray-0)',
          position: 'sticky',
          top: 0,
          zIndex: 2,
        }}
      >
        <Text size="sm" fw={500} ta="center" c={isToday(day) ? 'blue' : undefined}>
          {format(day, 'EEE')}
        </Text>
        <Text size="xs" c={isToday(day) ? 'blue' : 'dimmed'} ta="center">
          {format(day, 'd')}
        </Text>
      </Box>

      <Box style={{ position: 'relative', backgroundColor: 'white', zIndex: 1 }}>
        {timeSlots.map((time) => {
          const { setNodeRef } = useDroppable({
            id: `${format(day, 'yyyy-MM-dd')}-${time}`,
            data: { date: day, time },
          });

          return (
            <Box
              key={`${day.toISOString()}-${time}`}
              ref={setNodeRef}
              style={{
                height: `${SLOT_HEIGHT}px`,
                borderBottom: '1px solid var(--mantine-color-gray-2)',
                position: 'relative',
                zIndex: 1
              }}
            />
          );
        })}

        {appointments
          .filter(apt => isSameDay(apt.start, day))
          .map((apt) => {
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
                  zIndex: 2
                }}
              />
            );
          })}
      </Box>
    </Box>
  );
}

export function WeekCalendar({ selectedDate, appointments, onAppointmentClick }: WeekCalendarProps) {
  const weekStart = startOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <Box style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
      <Paper 
        withBorder 
        style={{ 
          flex: 1,
          display: 'flex',
          overflow: 'auto',
          height: '100%',
          position: 'relative',
          zIndex: 0
        }}
      >
        <TimeColumn />
        
        <Box style={{ display: 'flex', flex: 1, minWidth: 0, position: 'relative' }}>
          {weekDays.map((day) => (
            <DayColumn
              key={day.toISOString()}
              day={day}
              appointments={appointments}
              onAppointmentClick={onAppointmentClick}
            />
          ))}
        </Box>
      </Paper>
    </Box>
  );
}