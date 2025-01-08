import { useState, useMemo, useEffect } from 'react';
import { Patient } from '@medplum/fhirtypes';
import { addWeeks, addMonths, setDay } from 'date-fns';
import type { Appointment } from '../../../types/calendar';

interface AppointmentFormState {
  patient: Patient | undefined;
  date: Date | null;
  startTime: string | null;
  endTime: string | null;
  isRecurring: boolean;
  type: 'intake therapy' | 'followup therapy';
  // Add recurring options
  frequency: string;
  occurrences: number;
  selectedDays: string[];
}

function getDefaultTimes(): { startTime: string; endTime: string } {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  
  const roundedHour = currentMinutes >= 30 ? currentHour + 1 : currentHour;
  const startHour = roundedHour.toString().padStart(2, '0');
  
  return {
    startTime: `${startHour}:00`,
    endTime: `${startHour}:50`
  };
}

const { startTime, endTime } = getDefaultTimes();

export function useAppointmentForm(initialDate?: Date) {
  console.log('useAppointmentForm initialDate:', initialDate);
  
  // Create defaultState inside a useMemo to ensure it's stable
  const defaultState = useMemo(() => ({
    patient: undefined,
    date: initialDate || new Date(),
    startTime,
    endTime,
    isRecurring: false,
    type: 'followup therapy',
    frequency: 'weekly',
    occurrences: 4,
    selectedDays: []
  }), [initialDate]); // Only recreate when initialDate changes
  
  console.log('useAppointmentForm defaultState.date:', defaultState.date);
  const [state, setState] = useState(defaultState);
  console.log('useAppointmentForm current state.date:', state.date);

  // Add an effect to update the date when initialDate changes
  useEffect(() => {
    if (initialDate) {
      setState(prev => ({
        ...prev,
        date: initialDate
      }));
    }
  }, [initialDate]);

  const isValid = () => {
    return !!(
      state.patient &&
      state.date &&
      state.startTime &&
      state.endTime &&
      (!state.isRecurring || (state.selectedDays.length > 0 && state.occurrences > 0))
    );
  };

  const parseTime = (timeStr: string | null): { hours: number; minutes: number } | null => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  };

  const generateAppointments = (): Omit<Appointment, 'id'>[] => {
    if (!state.date || !state.patient) return [];

    const baseAppointment = getBaseAppointment();
    if (!baseAppointment) return [];

    if (!state.isRecurring) {
      return [baseAppointment];
    }

    const appointments: Omit<Appointment, 'id'>[] = [];
    const startDate = new Date(state.date);
    const startTime = parseTime(state.startTime);
    const endTime = parseTime(state.endTime);
    if (!startTime || !endTime) return [];

    const seriesId = generateUniqueId();

    for (let i = 0; i < state.occurrences; i++) {
      if (state.frequency === 'weekly' || state.frequency === 'biweekly') {
        state.selectedDays.forEach(dayStr => {
          const day = parseInt(dayStr);
          const date = setDay(startDate, day);
          
          if (date >= startDate) {
            const start = new Date(date);
            start.setHours(startTime.hours, startTime.minutes);
            
            const end = new Date(date);
            end.setHours(endTime.hours, endTime.minutes);

            appointments.push({
              ...baseAppointment,
              start,
              end,
              seriesId,
              sequenceNumber: i
            });
          }
        });

        // Move to next week/bi-week
        const weeksToAdd = state.frequency === 'weekly' ? 1 : 2;
        startDate.setDate(startDate.getDate() + (7 * weeksToAdd));
      } else if (state.frequency === 'monthly') {
        const start = addMonths(startDate, i);
        start.setHours(startTime.hours, startTime.minutes);
        
        const end = new Date(start);
        end.setHours(endTime.hours, endTime.minutes);

        appointments.push({
          ...baseAppointment,
          start,
          end,
          seriesId,
          sequenceNumber: i
        });
      }
    }

    return appointments;
  };

  const getBaseAppointment = (): Omit<Appointment, 'id'> | null => {
    if (!state.date || !state.startTime || !state.endTime || !state.patient) return null;

    const start = new Date(state.date);
    const startTime = parseTime(state.startTime);
    const endTime = parseTime(state.endTime);
    if (!startTime || !endTime) return null;

    start.setHours(startTime.hours, startTime.minutes);
    const end = new Date(state.date);
    end.setHours(endTime.hours, endTime.minutes);

    return {
      title: `${state.type} - ${state.patient.name?.[0]?.given?.join(' ')} ${state.patient.name?.[0]?.family}`,
      start,
      end,
      type: state.type,
      status: 'booked',
      patientName: `${state.patient.name?.[0]?.given?.join(' ')} ${state.patient.name?.[0]?.family}`,
      patientId: state.patient.id || '',
      participant: [{
        actor: {
          reference: `Patient/${state.patient.id}`,
          display: `${state.patient.name?.[0]?.given?.join(' ')} ${state.patient.name?.[0]?.family}`,
          type: 'Patient'
        },
        status: 'accepted',
        type: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
            code: 'ATND'
          }]
        }]
      }]
    };
  };

  const reset = () => {
    const { startTime, endTime } = getDefaultTimes();
    setState({ ...defaultState, startTime, endTime, date: new Date() });
  };

  return {
    state,
    setState,
    isValid,
    generateAppointments,
    reset
  };
}