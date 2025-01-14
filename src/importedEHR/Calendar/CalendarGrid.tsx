import { Grid, Paper } from '@mantine/core';
import { format, isSameMonth } from 'date-fns';
import { CalendarCell } from './CalendarCell';
import type { Appointment } from '../../types/calendar';

interface CalendarGridProps {
  days: Date[];
  selectedDate: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
}

export function CalendarGrid({ days, selectedDate, appointments, onAppointmentClick }: CalendarGridProps) {
  return (
    <Paper 
      withBorder 
      style={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        overflow: 'visible',
      }}
    >
      <Grid columns={7} gutter={0}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <Grid.Col key={day} span={1} p="xs" bg="gray.0">
            <div style={{ textAlign: 'center', fontWeight: 500, color: 'gray' }}>
              {day}
            </div>
          </Grid.Col>
        ))}
        {days.map((day, index) => {
          const dayAppointments = appointments.filter(
            (apt) => format(apt.start, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
          );
          
          const isOtherMonth = !isSameMonth(day, selectedDate);
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          
          return (
            <Grid.Col key={index} span={1} p={0}>
              <CalendarCell
                day={day}
                isOtherMonth={isOtherMonth}
                isToday={isToday}
                appointments={dayAppointments}
                onAppointmentClick={onAppointmentClick}
              />
            </Grid.Col>
          );
        })}
      </Grid>
    </Paper>
  );
}