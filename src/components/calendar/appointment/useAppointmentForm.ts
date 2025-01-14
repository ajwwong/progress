import { useState, useMemo, useEffect } from 'react';
import { Patient } from '@medplum/fhirtypes';
import { addWeeks, addMonths, setDay } from 'date-fns';
import type { Appointment } from '../../../types/calendar';
import { addMinutesToTime, getTimeDifferenceInMinutes } from './timeUtils';

interface AppointmentFormState {
  patient: Patient | undefined;
  date: Date | null;
  startTime: string | null;
  endTime: string | null;
  defaultInterval: number;  // in minutes
  isRecurring: boolean;
  type: 'ROUTINE' | 'FOLLOWUP';
  frequency: string;
  occurrences: number;
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

const DEBUG_MODE = false;

export function useAppointmentForm(initialDate?: Date) {
  console.log('useAppointmentForm initialDate:', initialDate);
  
  // Create defaultState inside a useMemo to ensure it's stable
  const defaultState: AppointmentFormState = {
    patient: undefined,
    date: initialDate || new Date(),
    startTime,
    endTime,
    defaultInterval: 50,
    isRecurring: false,
    type: 'FOLLOWUP',
    frequency: 'weekly',
    occurrences: 4
  };
  
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
      (!state.isRecurring || state.occurrences > 0)
    );
  };

  const parseTime = (timeStr: string | null): { hours: number; minutes: number } | null => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  };

  const generateAppointments = (): Omit<Appointment, 'id'>[] => {
    if (!state.date || !state.patient) return [];
    if (DEBUG_MODE) console.log('Current frequency:', state.frequency);

    const baseAppointment = getBaseAppointment();
    if (!baseAppointment) return [];

    if (!state.isRecurring) {
      return [baseAppointment];
    }

    const appointments: Omit<Appointment, 'id'>[] = [];
    const startTime = parseTime(state.startTime);
    const endTime = parseTime(state.endTime);
    if (!startTime || !endTime) return [];

    const seriesId = crypto.randomUUID();

    // Parse the frequency string (e.g., "every-2-weeks" or "every-1-month")
    let interval = 1;
    let period = 'week';

    if (state.frequency.includes('-')) {
      const [, intervalStr, periodStr] = state.frequency.split('-');
      interval = parseInt(intervalStr, 10);
      period = periodStr.replace('s', ''); // Remove 's' if present
    }

    for (let i = 0; i < state.occurrences; i++) {
      const appointmentDate = new Date(state.date);
      
      // Calculate the offset in days or months
      if (period === 'week') {
        appointmentDate.setDate(appointmentDate.getDate() + (i * 7 * interval));
      } else if (period === 'month') {
        appointmentDate.setMonth(appointmentDate.getMonth() + (i * interval));
      }

      const start = new Date(appointmentDate);
      start.setHours(startTime.hours, startTime.minutes, 0, 0);
      
      const end = new Date(appointmentDate);
      end.setHours(endTime.hours, endTime.minutes, 0, 0);

      appointments.push({
        ...baseAppointment,
        start,
        end,
        seriesId,
        remainingSessions: state.occurrences - i
      });
    }

    return appointments;
  };

  const getBaseAppointment = (): Omit<Appointment, 'id'> | null => {
    console.log('getBaseAppointment state:', {
      date: state.date,
      patient: state.patient,
      startTime: state.startTime,
      endTime: state.endTime
    });

    if (!state.date || !state.patient || !state.startTime || !state.endTime) {
      console.log('Missing required fields');
      return null;
    }

    const startTime = parseTime(state.startTime);
    const endTime = parseTime(state.endTime);
    
    console.log('Parsed times:', { startTime, endTime });
    
    if (!startTime || !endTime) {
      console.log('Invalid time format');
      return null;
    }

    const start = new Date(state.date);
    start.setHours(startTime.hours, startTime.minutes);
    
    const end = new Date(state.date);
    end.setHours(endTime.hours, endTime.minutes);

    return {
      title: `${state.type.toUpperCase()} - ${state.patient.name?.[0]?.given?.join(' ')} ${state.patient.name?.[0]?.family}`,
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

  const setStartTime = (time: string) => {
    setState(prev => ({
      ...prev,
      startTime: time,
      endTime: addMinutesToTime(time, prev.defaultInterval)
    }));
  };

  const setEndTime = (time: string) => {
    if (state.startTime) {
      setState(prev => ({
        ...prev,
        endTime: time,
        defaultInterval: getTimeDifferenceInMinutes(state.startTime, time)
      }));
    }
  };

  const setDefaultInterval = (minutes: number) => {
    if (state.startTime) {
      setState(prev => ({
        ...prev,
        defaultInterval: minutes,
        endTime: addMinutesToTime(state.startTime, minutes)
      }));
    }
  };

  return {
    state,
    setState,
    setStartTime,
    setEndTime,
    setDefaultInterval,
    isValid,
    generateAppointments,
    reset
  };
}