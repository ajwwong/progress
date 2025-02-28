import { Box } from '@mantine/core';
import { Calendar } from '../components/calendar/Calendar';

/**
 * CalendarPage component that displays the main calendar interface.
 * Provides a full-width, full-height container for the calendar.
 */
export function CalendarPage(): JSX.Element {
  return (
    <Box 
      style={{
        height: 'calc(100vh - 60px)', // Account for header/navigation
        width: '100%'
      }}
    >
      <Calendar />
    </Box>
  );
}