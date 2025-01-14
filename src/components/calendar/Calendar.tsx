import { Paper, Stack } from '@mantine/core';
import { startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, parseISO, setHours, setMinutes, startOfDay, endOfDay } from 'date-fns';
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
import { RecurringUpdateModal } from './RecurringUpdateModal';

export function Calendar() {
  const DEBUG_MODE = false;

  const medplum = useMedplum();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<string>('month');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [recurringModalOpened, setRecurringModalOpened] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<Appointment | null>(null);
  const [originalAppointment, setOriginalAppointment] = useState<Appointment | null>(null);

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
    console.log('Loading appointments for view:', view, 'and date:', selectedDate);
    loadAppointments();
  }, [view, selectedDate]);

  const loadAppointments = async () => {
    try {
      if (DEBUG_MODE) console.log('Fetching appointments...');
      let allResults = [];
      let count = 0;
      
      while (true) {
        const results = await medplum.searchResources('Appointment', {
          _sort: '-_lastUpdated',
          _count: '100',
          _offset: count.toString(),
          status: 'booked,pending,arrived,fulfilled,cancelled,noshow',
          _include: 'Appointment:patient'
        });
        
        if (results.length === 0) break;
        
        allResults = [...allResults, ...results];
        count += results.length;
        
        if (results.length < 100) break;
      }

      const calendarAppointments = allResults
        .filter(appt => {
          if (!appt.id || !appt.start || !appt.end) {
            if (DEBUG_MODE) console.log('Filtered out appointment - missing required fields:', appt);
            return false;
          }
          
          const startDate = new Date(appt.start);
          const endDate = new Date(appt.end);
          
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            if (DEBUG_MODE) console.log('Filtered out appointment - invalid date format:', {
              id: appt.id,
              description: appt.description,
              start: startDate.toLocaleString(),
              end: endDate.toLocaleString(),
              status: appt.status
            });
            return false;
          }

          if (endDate < startDate) {
            endDate.setDate(endDate.getDate() + 1);
            if (DEBUG_MODE) console.log('Adjusted end date to next day:', {
              id: appt.id,
              description: appt.description,
              start: startDate.toLocaleString(),
              end: endDate.toLocaleString(),
              status: appt.status
            });
          }
          
          if (DEBUG_MODE) console.log('Processing appointment:', {
            id: appt.id,
            description: appt.description,
            start: startDate.toLocaleString(),
            end: endDate.toLocaleString(),
            status: appt.status
          });

          return true;
        })
        .map(fhirAppointment => {
          const patientParticipant = fhirAppointment.participant?.find(
            p => p.actor?.reference?.startsWith('Patient/')
          );

          const patientId = patientParticipant?.actor?.reference?.split('Patient/')[1];
          
          // Extract series ID and sequence number from identifiers
          const seriesIdentifier = fhirAppointment.identifier?.find(
            id => id.system === 'http://terminology.hl7.org/CodeSystem/appointment-series'
          );
          const sequenceIdentifier = fhirAppointment.identifier?.find(
            id => id.system === 'http://terminology.hl7.org/CodeSystem/appointment-sequence'
          );

          // Ensure dates are properly converted from UTC to local time
          const start = new Date(fhirAppointment.start as string);
          const end = new Date(fhirAppointment.end as string);

          return {
            id: fhirAppointment.id as string,
            title: fhirAppointment.description || 'Untitled',
            start,
            end,
            patientName: patientParticipant?.actor?.display || fhirAppointment.participant?.[0]?.actor?.display || 'Unknown Patient',
            patientId: patientId || '',
            type: (fhirAppointment.appointmentType?.coding?.[0]?.code as Appointment['type']) || 'FOLLOWUP',
            status: (fhirAppointment.status as Appointment['status']) || 'booked',
            seriesId: seriesIdentifier?.value,
            remainingSessions: sequenceIdentifier?.value ? parseInt(sequenceIdentifier.value) : undefined
          };
        });

      if (DEBUG_MODE) console.log('Final processed appointments:', calendarAppointments);
      setAppointments(calendarAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
      setAppointments([]);
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

      // Store original appointment state before update
      const originalAppointment = { ...appointment };

      // Create a temporary updated appointment object
      const updatedAppointment = {
        ...appointment,
        start: newStart,
        end: newEnd
      };

      // Update UI immediately for better UX
      setAppointments(currentAppointments => 
        currentAppointments.map(apt => 
          apt.id === appointmentId 
            ? updatedAppointment
            : apt
        )
      );

      if (appointment.seriesId && appointment.remainingSessions === 0) {
        // If it's the last appointment in series, remove series identifiers
        await medplum.updateResource({
          ...existingAppointment,
          start: newStart.toISOString(),
          end: newEnd.toISOString(),
          // Remove series identifiers
          identifier: (existingAppointment.identifier || []).filter(
            id => id.system !== 'http://terminology.hl7.org/CodeSystem/appointment-series' &&
                 id.system !== 'http://terminology.hl7.org/CodeSystem/appointment-sequence'
          )
        });
      } else if (!appointment.seriesId) {
        // If it's a single appointment, update normally
        await medplum.updateResource({
          ...existingAppointment,
          start: newStart.toISOString(),
          end: newEnd.toISOString(),
        });
      } else {
        // If it's a recurring appointment (not last), show the modal
        setPendingUpdate(updatedAppointment);
        setOriginalAppointment(originalAppointment);
        setRecurringModalOpened(true);
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      await loadAppointments();
    }
  };

  const handleNewAppointment = async (appointmentData: Omit<Appointment, 'id'>[]) => {
    console.log('Appointment data received:', appointmentData);
    try {
      for (const appointment of appointmentData) {
        const resource = {
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
          participant: [{
            actor: {
              display: appointment.patientName,
              reference: `Patient/${appointment.patientId}`
            },
            status: 'accepted',
            type: [{
              coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                code: 'ATND'
              }]
            }]
          }],
          identifier: []
        };

        if (appointment.seriesId) {
          resource.identifier = [
            {
              system: 'http://terminology.hl7.org/CodeSystem/appointment-series',
              value: appointment.seriesId
            },
            {
              system: 'http://terminology.hl7.org/CodeSystem/appointment-sequence',
              value: appointment.remainingSessions?.toString()
            }
          ];
        }

        console.log('Creating appointment with resource:', resource);
        await medplum.createResource(resource);
      }

      await loadAppointments();
    } catch (error) {
      console.error('Error creating appointments:', error);
    }
  };

  const handleUpdateAppointment = async (updatedAppointment: Appointment) => {
    try {
      const existingAppointment = await medplum.readResource('Appointment', updatedAppointment.id);

      if (updatedAppointment.seriesId && updatedAppointment.remainingSessions === 0) {
        // If it's the last appointment in series, remove series identifiers
        await medplum.updateResource({
          ...existingAppointment,
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
          description: updatedAppointment.title,
          // Remove series identifiers
          identifier: (existingAppointment.identifier || []).filter(
            id => id.system !== 'http://terminology.hl7.org/CodeSystem/appointment-series' &&
                 id.system !== 'http://terminology.hl7.org/CodeSystem/appointment-sequence'
          )
        });
      } else if (!updatedAppointment.seriesId) {
        // Handle non-recurring appointment update
        await medplum.updateResource({
          ...existingAppointment,
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
      } else {
        // If it's a recurring appointment (not last), show the modal
        setPendingUpdate(updatedAppointment);
        setOriginalAppointment(existingAppointment);
        setRecurringModalOpened(true);
        return;
      }

      await loadAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      await loadAppointments();
    }
  };

  const handleRecurringUpdate = async (updateSeries: boolean) => {
    if (!pendingUpdate) return;

    try {
      const existingAppointment = await medplum.readResource('Appointment', pendingUpdate.id);
      
      if (!updateSeries) {
        // Update only this appointment and remove it from the series
        await medplum.updateResource({
          ...existingAppointment,
          start: pendingUpdate.start.toISOString(),
          end: pendingUpdate.end.toISOString(),
          status: pendingUpdate.status,
          appointmentType: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
              code: pendingUpdate.type,
              display: pendingUpdate.type.charAt(0).toUpperCase() + pendingUpdate.type.slice(1)
            }]
          },
          description: pendingUpdate.title,
          // Remove series identifiers
          identifier: (existingAppointment.identifier || []).filter(
            id => id.system !== 'http://terminology.hl7.org/CodeSystem/appointment-series' &&
                 id.system !== 'http://terminology.hl7.org/CodeSystem/appointment-sequence'
          )
        });
      } else {
        // Calculate time difference
        const originalStart = new Date(existingAppointment.start);
        const newStart = new Date(pendingUpdate.start);
        const timeGap = newStart.getTime() - originalStart.getTime();
        
        const newSeriesId = crypto.randomUUID();

        // Search without the _sort parameter
        const searchResponse = await medplum.search('Appointment', {
          identifier: `http://terminology.hl7.org/CodeSystem/appointment-series|${pendingUpdate.seriesId}`
        });

        // Sort the appointments in memory
        const allAppointments = searchResponse.entry
          ?.map(e => e.resource as any)
          ?.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        if (allAppointments && allAppointments.length > 0) {
          for (const appointment of allAppointments) {
            const sequenceNumber = appointment.identifier?.find(
              id => id.system === 'http://terminology.hl7.org/CodeSystem/appointment-sequence'
            )?.value;

            if (sequenceNumber && parseInt(sequenceNumber) <= parseInt(pendingUpdate.remainingSessions!.toString())) {
              const appointmentStart = new Date(appointment.start);
              const appointmentEnd = new Date(appointment.end);
              const newAppointmentStart = new Date(appointmentStart.getTime() + timeGap);
              const newAppointmentEnd = new Date(appointmentEnd.getTime() + timeGap);

              await medplum.updateResource({
                ...appointment,
                start: newAppointmentStart.toISOString(),
                end: newAppointmentEnd.toISOString(),
                status: pendingUpdate.status,
                appointmentType: {
                  coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
                    code: pendingUpdate.type,
                    display: pendingUpdate.type.charAt(0).toUpperCase() + pendingUpdate.type.slice(1)
                  }]
                },
                description: pendingUpdate.title,
                identifier: [
                  ...(appointment.identifier || []).filter(
                    id => id.system !== 'http://terminology.hl7.org/CodeSystem/appointment-series'
                  ),
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/appointment-series',
                    value: newSeriesId
                  }
                ]
              });
            }
          }
        }
      }

      setRecurringModalOpened(false);
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

  const handleRecurringModalClose = () => {
    // Revert the optimistic UI update if modal is closed without saving
    if (originalAppointment) {
      setAppointments(currentAppointments =>
        currentAppointments.map(apt =>
          apt.id === originalAppointment.id
            ? originalAppointment
            : apt
        )
      );
    }
    setRecurringModalOpened(false);
    setPendingUpdate(null);
    setOriginalAppointment(null);
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

      <RecurringUpdateModal
        opened={recurringModalOpened}
        onClose={handleRecurringModalClose}
        onConfirm={() => handleRecurringUpdate(true)}
        onCancel={() => handleRecurringUpdate(false)}
      />
    </Paper>
  );
}