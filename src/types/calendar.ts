export interface Appointment {
  id: string;
  title: string;
  start: Date;
  end: Date;
  patientName: string;
  patientId: string;
  type: 'FOLLOWUP' | 'ROUTINE';
  status: 'booked' | 'fulfilled' | 'cancelled' | 'noshow';
  seriesId?: string;
  remainingSessions?: number;
}

export type CalendarView = 'month' | 'week' | 'day';