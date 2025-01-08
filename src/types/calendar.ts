export interface Appointment {
  id: string;
  title: string;
  start: Date;
  end: Date;
  patientName: string;
  patientId: string;
  type: 'intake therapy' | 'followup therapy';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no show' | 'late cancelled' | 'show';
  seriesId?: string;
  sequenceNumber?: number;
}