import { Paper, Text, Stack } from '@mantine/core';
import { format } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { AppointmentItem } from './AppointmentItem';
import type { Appointment } from '../types/calendar';

interface CalendarCellProps {
  day: Date;
  isOtherMonth: boolean;
  isToday: boolean;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  height: number;
}

export function CalendarCell({ 
  day, 
  isOtherMonth, 
  isToday, 
  appointments, 
  onAppointmentClick,
  height
}: CalendarCellProps) {
  const { setNodeRef } = useDroppable({
    id: `droppable-${format(day, 'yyyy-MM-dd')}`,
    data: { date: day },
  });

  return (
    <Paper
      ref={setNodeRef}
      p="4px 8px"
      style={{
        height: `${height}px`,
        backgroundColor: isOtherMonth ? 'var(--mantine-color-gray-0)' : 'white',
        border: '1px solid var(--mantine-color-gray-2)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        height: 24,
        position: 'relative',
        zIndex: 1 
      }}>
        <div
          style={{
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            backgroundColor: isToday ? 'var(--mantine-color-blue-5)' : 'transparent',
          }}
        >
          <Text
            size="sm"
            style={{
              fontWeight: isToday ? 600 : 'normal',
              color: isToday 
                ? 'white' 
                : isOtherMonth 
                  ? 'var(--mantine-color-gray-5)' 
                  : 'inherit',
            }}
          >
            {format(day, 'd')}
          </Text>
        </div>
      </div>
      <div style={{ 
        flex: 1, 
        paddingTop: 2,
        position: 'relative',
        zIndex: 1
      }}>
        {appointments
          .sort((a, b) => a.start.getTime() - b.start.getTime())
          .map((appointment) => (
            <AppointmentItem
              key={appointment.id}
              appointment={appointment}
              onClick={() => onAppointmentClick(appointment)}
              variant="month"
            />
          ))}
      </div>
    </Paper>
  );
}