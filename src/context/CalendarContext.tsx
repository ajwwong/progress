import React, { createContext, useState, ReactNode } from 'react';

interface CalendarContextType {
  showNewAppointmentModal: boolean;
  setShowNewAppointmentModal: (show: boolean) => void;
}

export const CalendarContext = createContext<CalendarContextType>({
  showNewAppointmentModal: false,
  setShowNewAppointmentModal: () => {},
});

export const CalendarContextProvider = ({ children }: { children: ReactNode }) => {
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);

  return (
    <CalendarContext.Provider value={{ showNewAppointmentModal, setShowNewAppointmentModal }}>
      {children}
    </CalendarContext.Provider>
  );
};