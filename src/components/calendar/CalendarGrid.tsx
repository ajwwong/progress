import { Grid, Paper } from '@mantine/core';
import { format, isSameMonth } from 'date-fns';
import { CalendarCell } from './CalendarCell';
import type { Appointment } from '../types/calendar';

interface CalendarGridProps {
  days: Date[];
  selectedDate: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onEmptyClick?: (date: Date) => void;
}
export function CalendarGrid({ 
  days, 
  selectedDate, 
  appointments, 
  onAppointmentClick,
  onEmptyClick 
}: CalendarGridProps) {
  const weeks = days.reduce((acc, day, i) => {
    const weekIndex = Math.floor(i / 7);
    if (!acc[weekIndex]) acc[weekIndex] = [];
    acc[weekIndex].push(day);
    return acc;
  }, [] as Date[][]);

  const calculateRowHeight = (weekDays: Date[]) => {
    const APPOINTMENT_HEIGHT = 20;
    const APPOINTMENT_MARGIN = 2;
    const HEADER_HEIGHT = 24;
    const PADDING_TOP = 8;
    const PADDING_BOTTOM = 0;
    const MIN_APPOINTMENTS = 7;

    const maxAppointments = Math.max(...weekDays.map(day => 
      appointments.filter(apt => 
        format(apt.start, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      ).length
    ));

    const appointmentsToFit = Math.max(MIN_APPOINTMENTS, maxAppointments);

    return HEADER_HEIGHT + PADDING_TOP + PADDING_BOTTOM + 
           (appointmentsToFit * APPOINTMENT_HEIGHT) + 
           ((appointmentsToFit - 1) * APPOINTMENT_MARGIN);
  };

  return (
    <Paper withBorder style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      <Grid columns={7} gutter={0}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <Grid.Col key={day} span={1} p="xs" bg="gray.0">
            <div style={{ textAlign: 'center', fontWeight: 500, color: 'gray' }}>
              {day}
            </div>
          </Grid.Col>
        ))}
        
        {weeks.map((weekDays, weekIndex) => {
          const rowHeight = calculateRowHeight(weekDays);
          
          return (
            <Grid.Col key={weekIndex} span={7} p={0} style={{ display: 'contents' }}>
              {weekDays.map((day, dayIndex) => {
                const dayAppointments = appointments.filter(
                  apt => format(apt.start, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                );
                
                const isOtherMonth = !isSameMonth(day, selectedDate);
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                
                return (
                  <Grid.Col key={`${weekIndex}-${dayIndex}`} span={1} p={0}>
                    <CalendarCell
                      day={day}
                      isOtherMonth={isOtherMonth}
                      isToday={isToday}
                      appointments={dayAppointments}
                      onAppointmentClick={onAppointmentClick}
                      height={rowHeight}
                      onEmptyClick={onEmptyClick}
                    />
                  </Grid.Col>
                );
              })}
            </Grid.Col>
          );
        })}
      </Grid>
    </Paper>
  );
}