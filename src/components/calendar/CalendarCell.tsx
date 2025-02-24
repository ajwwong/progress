import { Paper, Text, Stack } from '@mantine/core';
import { format } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { AppointmentItem } from './AppointmentItem';
import type { Appointment } from '../../types/calendar';

interface CalendarCellProps {
  day: Date;
  isOtherMonth: boolean;
  isToday: boolean;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  height: number;
  onEmptyClick?: (date: Date) => void;  // Add this prop
}

export function CalendarCell({ 
  day, 
  isOtherMonth, 
  isToday, 
  appointments, 
  onAppointmentClick,
  height,
  onEmptyClick
}: CalendarCellProps) {
  const { setNodeRef } = useDroppable({
    id: `droppable-${format(day, 'yyyy-MM-dd')}`,
    data: { date: day },
  });

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on or inside an AppointmentItem
    if (e.target instanceof Element && 
        (e.target.closest('.appointment-item') || // Check for appointment item class
         e.target.closest('button'))) { // Check for any button elements
      return;
    }

    // Only trigger if clicking the paper itself or the empty space div
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.empty-space')) {
      onEmptyClick?.(day);
    }
  };

  // Add type guard
  function isDateObject(date: Date | string): date is Date {
    return date instanceof Date;
  }

  // Simplified sorting with type assertion
  const sortedAppointments = [...appointments].sort((a, b) => {
    const startA = isDateObject(a.start) ? a.start : new Date(a.start);
    const startB = isDateObject(b.start) ? b.start : new Date(b.start);
    return startA.getTime() - startB.getTime();
  });

  return (
    <Paper
      ref={setNodeRef}
      p="3px 3px"
      onClick={handleClick}
      style={{
        height: `${height}px`,
        backgroundColor: isOtherMonth ? 'var(--mantine-color-gray-0)' : 'white',
        border: '1px solid var(--mantine-color-gray-2)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        cursor: 'pointer',
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
      <div 
        className="empty-space"
        style={{ 
          flex: 1,
          paddingTop: 0,
          paddingBottom: 0,
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {sortedAppointments
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