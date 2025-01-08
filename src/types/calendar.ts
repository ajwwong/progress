export interface Appointment {
  id: string;
  title: string;
  start: Date;
  end: Date;
  patientName: string;
  patientId: string;
  type: 'intake therapy' | 'followup therapy';
  status: 'show' | 'cancelled' | 'late cancelled' | 'no show' | 'scheduled' | 'completed';
  seriesId?: string;
  sequenceNumber?: number;
}