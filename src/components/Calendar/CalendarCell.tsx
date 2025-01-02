import { Box, Stack } from '@mantine/core';
import { format } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { AppointmentItem } from './AppointmentItem';
import { CalendarContext } from '../../App';
import { useContext } from 'react';
import type { Appointment } from '../../types/calendar';

interface CalendarCellProps {
  day: Date;
  isOtherMonth: boolean;
  isToday: boolean;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
}

export function CalendarCell({ 
  day, 
  isOtherMonth, 
  isToday, 
  appointments,
  onAppointmentClick 
}: CalendarCellProps) {
  const { setShowNewAppointmentModal } = useContext(CalendarContext);
  const { setNodeRef, isOver } = useDroppable({
    id: format(day, 'yyyy-MM-dd'),
    data: {
      date: day
    },
  });

  // Sort appointments by start time
  const sortedAppointments = [...appointments].sort((a, b) => 
    a.start.getTime() - b.start.getTime()
  );

  const handleCellClick = (e: React.MouseEvent) => {
    // Only handle clicks on the cell itself, not on appointments
    if ((e.target as HTMLElement).closest('.appointment-item')) {
      return;
    }
    
    // Store the selected date in localStorage
    localStorage.setItem('selectedAppointmentDate', day.toISOString());
    setShowNewAppointmentModal(true);
  };

  return (
    <Box
      ref={setNodeRef}
      p="xs"
      bg={isOtherMonth ? 'gray.0' : isOver ? 'blue.0' : 'white'}
      style={(theme) => ({
        borderRight: `1px solid ${theme.colors.gray[2]}`,
        borderBottom: `1px solid ${theme.colors.gray[2]}`,
        position: 'relative',
        minHeight: 120,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
      })}
      onClick={handleCellClick}
    >
      <Box
        style={(theme) => ({
          position: 'absolute',
          top: theme.spacing.xs,
          right: theme.spacing.xs,
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          backgroundColor: isToday ? theme.colors.blue[6] : 'transparent',
          color: isToday ? 'white' : theme.colors.gray[7],
          zIndex: 1,
        })}
      >
        {format(day, 'd')}
      </Box>
      
      <Stack gap={2} mt={30} style={{ flex: 1, overflow: 'visible' }}>
        {sortedAppointments.map((appointment) => (
          <AppointmentItem 
            key={appointment.id} 
            appointment={appointment}
            onClick={() => onAppointmentClick(appointment)}
          />
        ))}
      </Stack>
    </Box>
  );
}