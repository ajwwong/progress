import React from 'react';
import { Calendar } from '../components/Calendar/Calendar';
import { CalendarContextProvider } from '../context/CalendarContext';

function CalendarPage() {
  return (
    <CalendarContextProvider>
      <Calendar />
    </CalendarContextProvider>
  );
}

export default CalendarPage; 