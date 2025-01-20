import { useState, useEffect } from 'react';
import { useMedplum } from '@medplum/react';
import { Appointment, Patient, Composition } from '@medplum/fhirtypes';

export interface AppointmentWithNote extends Appointment {
  note?: Composition | null;
}

export interface UsePatientAppointmentsResult {
  pastAppointments: AppointmentWithNote[];
  upcomingAppointments: AppointmentWithNote[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePatientAppointments(patient: Patient): UsePatientAppointmentsResult {
  const medplum = useMedplum();
  const [appointments, setAppointments] = useState<AppointmentWithNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch appointments
      const fetchedAppointments = await medplum.searchResources('Appointment', {
        patient: `Patient/${patient.id}`,
        _sort: '-date',
        _count: '50'
      });

      // Fetch notes for each appointment
      const appointmentsWithNotes = await Promise.all(
        fetchedAppointments.map(async (apt) => {
          try {
            const compositions = await medplum.searchResources('Composition', {
              encounter: `Encounter/${apt.id}`,
              _sort: '-date',
              _count: '1'
            });
            return {
              ...apt,
              note: compositions[0] || null
            };
          } catch (err) {
            console.error('Error fetching note for appointment:', err);
            return {
              ...apt,
              note: null
            };
          }
        })
      );

      setAppointments(appointmentsWithNotes);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch appointments'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (patient?.id) {
      fetchAppointments();
    }
  }, [patient?.id]);

  const now = new Date();
  const pastAppointments = appointments
    .filter(apt => new Date(apt.start || '') <= now)
    .sort((a, b) => new Date(b.start || '').getTime() - new Date(a.start || '').getTime());

  const upcomingAppointments = appointments
    .filter(apt => new Date(apt.start || '') > now)
    .sort((a, b) => new Date(a.start || '').getTime() - new Date(b.start || '').getTime());

  return {
    pastAppointments,
    upcomingAppointments,
    isLoading,
    error,
    refetch: fetchAppointments
  };
} 