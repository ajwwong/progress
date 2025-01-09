import { Paper, Stack } from '@mantine/core';
import { startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, parseISO, setHours, setMinutes } from 'date-fns';
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { useState, useEffect } from 'react';
import { useMedplum } from '@medplum/react';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';
import { WeekCalendar } from './WeekCalendar';
import { DayCalendar } from './DayCalendar';
import { AppointmentItem } from './AppointmentItem';
import { AppointmentModal } from './AppointmentModal';
import { AppointmentDetailsModal } from './AppointmentDetailsModal';
import { PatientModal } from './PatientModal';
import type { Appointment } from '../types/calendar';

export function Calendar() {
  const medplum = useMedplum();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<string>('month');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const results = await medplum.searchResources('Appointment', {
        _sort: '-_lastUpdated',
        _count: '100',
        status: 'booked,cancelled,noshow',
        _include: 'Appointment:patient'
      });
  
      const calendarAppointments = results
        .filter(appt => appt.id && appt.start && appt.end)
        .map(fhirAppointment => {
          const patientParticipant = fhirAppointment.participant?.find(
            p => p.actor?.reference?.startsWith('Patient/')
          );
  
          const patientId = patientParticipant?.actor?.reference?.split('Patient/')[1];
  
          return {
            id: fhirAppointment.id as string,
            title: fhirAppointment.description || 'Untitled',
            start: new Date(fhirAppointment.start as string),
            end: new Date(fhirAppointment.end as string),
            patientName: patientParticipant?.actor?.display || 'Unknown Patient',
            patientId: patientId || '',
            type: (fhirAppointment.appointmentType?.coding?.[0]?.code as Appointment['type']) || 'followup therapy',
            status: (fhirAppointment.status as Appointment['status']) || 'scheduled'
          };
        });
  
      setAppointments(calendarAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const appointment = appointments.find(apt => apt.id === active.id);
    if (appointment) {
      setActiveAppointment(appointment);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveAppointment(null);
    
    if (!over) return;

    const appointmentId = active.id as string;
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment) return;

    const dropData = over.data.current as { date: Date; time?: string };
    if (!dropData) return;

    try {
      const existingAppointment = await medplum.readResource('Appointment', appointmentId);
      
      let newStart: Date;
      if (dropData.time) {
        newStart = new Date(dropData.date);
        const [hours, minutes] = dropData.time.split(':').map(Number);
        newStart = setHours(newStart, hours);
        newStart = setMinutes(newStart, minutes);
      } else {
        newStart = new Date(dropData.date);
        newStart = setHours(newStart, appointment.start.getHours());
        newStart = setMinutes(newStart, appointment.start.getMinutes());
      }

      const duration = appointment.end.getTime() - appointment.start.getTime();
      const newEnd = new Date(newStart.getTime() + duration);

      setAppointments(currentAppointments => 
        currentAppointments.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, start: newStart, end: newEnd }
            : apt
        )
      );

      await medplum.updateResource({
        ...existingAppointment,
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
      });

      await loadAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      await loadAppointments();
    }
  };

  const handleNewAppointment = async (appointmentData: Omit<Appointment, 'id'>[]) => {
    try {
      for (const appointment of appointmentData) {
        await medplum.createResource({
          resourceType: 'Appointment',
          status: 'booked',
          appointmentType: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
              code: appointment.type,
              display: appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1)
            }]
          },
          description: appointment.title,
          start: appointment.start.toISOString(),
          end: appointment.end.toISOString(),
          participant: appointment.participant // Use the properly structured participant data
        });
      }
  
      await loadAppointments();
    } catch (error) {
      console.error('Error creating appointments:', error);
    }
  };

  const handleUpdateAppointment = async (updatedAppointment: Appointment) => {
    try {
      const existingAppointment = await medplum.readResource('Appointment', updatedAppointment.id);
      
      await medplum.updateResource({
        ...existingAppointment,
        resourceType: 'Appointment',
        start: updatedAppointment.start.toISOString(),
        end: updatedAppointment.end.toISOString(),
        status: updatedAppointment.status,
        appointmentType: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
            code: updatedAppointment.type,
            display: updatedAppointment.type.charAt(0).toUpperCase() + updatedAppointment.type.slice(1)
          }]
        },
        description: updatedAppointment.title
      });

      await loadAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      await loadAppointments();
    }
  };

  const getDaysInMonth = (date: Date) => {
    const start = startOfWeek(startOfMonth(date));
    const end = endOfWeek(endOfMonth(date));
    return eachDayOfInterval({ start, end });
  };

  const days = getDaysInMonth(selectedDate);

  const handleEmptyClick = (date: Date) => {
    console.log('handleEmptyClick called with date:', date);
    setSelectedDate(date);
    console.log('selectedDate updated to:', date);
    setIsAppointmentModalOpen(true);
  };

  return (
    <Paper p="md" radius="sm" withBorder style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Stack gap="md" style={{ height: '100%' }}>
        <CalendarHeader
          selectedDate={selectedDate}
          view={view}
          onViewChange={setView}
          onNewAppointment={() => setIsAppointmentModalOpen(true)}
          onNewPatient={() => setIsPatientModalOpen(true)}
          onDateChange={setSelectedDate}
        />
        <DndContext 
          sensors={sensors} 
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {view === 'month' ? (
            <CalendarGrid
              days={days}
              selectedDate={selectedDate}
              appointments={appointments}
              onAppointmentClick={setSelectedAppointment}
              onEmptyClick={handleEmptyClick}
            />
          ) : view === 'week' ? (
            <WeekCalendar
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              appointments={appointments}
              onAppointmentClick={setSelectedAppointment}
            />
          ) : (
            <DayCalendar
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              appointments={appointments}
              onAppointmentClick={setSelectedAppointment}
            />
          )}
      <DragOverlay dropAnimation={null}>
  {activeAppointment ? (
    <AppointmentItem 
      appointment={activeAppointment}
      onClick={() => {}}
      variant={view} // Pass the current view
      style={{ zIndex: 10000 }}
    />
  ) : null}
</DragOverlay>
        </DndContext>
      </Stack>

      <AppointmentModal
        opened={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        onSave={handleNewAppointment}
        initialDate={selectedDate}
      />

      <PatientModal
        opened={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
      />

      <AppointmentDetailsModal
        opened={selectedAppointment !== null}
        onClose={() => setSelectedAppointment(null)}
        appointment={selectedAppointment}
        onSave={handleUpdateAppointment}
        onDelete={loadAppointments}
      />
    </Paper>
  );
}