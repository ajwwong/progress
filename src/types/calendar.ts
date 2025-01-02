export interface Appointment {
  id: string;
  title: string;
  start: Date;
  end: Date;
  patientName: string;
  type: 'checkup' | 'surgery' | 'consultation' | 'followup';
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface CalendarCell {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: Appointment[];
}

export interface CalendarView {
  type: 'day' | 'week' | 'month';
  date: Date;
}