import { Paper, Stack } from '@mantine/core';
import { startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, parseISO, setHours, setMinutes, startOfDay } from 'date-fns';
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { useState, useContext, useEffect } from 'react';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';
import { WeekCalendar } from './WeekCalendar';
import { DayCalendar } from './DayCalendar';
import { AppointmentItem } from './AppointmentItem';
import { AppointmentModal } from './AppointmentModal';
import { AppointmentDetailsModal } from './AppointmentDetailsModal';
import { CalendarContext } from '../../App';
import type { Appointment } from '../../types/calendar';

const sampleAppointments: Appointment[] = [
  {
    id: '1',
    title: 'Annual Checkup',
    start: new Date(2024, 10, 1, 9, 0),
    end: new Date(2024, 10, 1, 10, 0),
    patientName: 'John Smith',
    type: 'checkup',
    status: 'scheduled'
  },
  {
    id: '2',
    title: 'Dental Surgery',
    start: new Date(2024, 10, 1, 11, 0),
    end: new Date(2024, 10, 1, 12, 30),
    patientName: 'Sarah Johnson',
    type: 'surgery',
    status: 'scheduled'
  },
  {
    id: '3',
    title: 'Follow-up Visit',
    start: new Date(2024, 10, 2, 14, 0),
    end: new Date(2024, 10, 2, 15, 0),
    patientName: 'Mike Brown',
    type: 'followup',
    status: 'scheduled'
  },
  {
    id: '4',
    title: 'Consultation',
    start: new Date(2024, 10, 3, 10, 0),
    end: new Date(2024, 10, 3, 11, 0),
    patientName: 'Emily Davis',
    type: 'consultation',
    status: 'scheduled'
  },
  {
    id: '5',
    title: 'Physical Therapy',
    start: new Date(2024, 10, 4, 13, 0),
    end: new Date(2024, 10, 4, 14, 0),
    patientName: 'Robert Wilson',
    type: 'followup',
    status: 'scheduled'
  }
];

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2024, 10, 1));
  const [view, setView] = useState<string>('month');
  const [appointments, setAppointments] = useState<Appointment[]>(sampleAppointments);
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const { showNewAppointmentModal, setShowNewAppointmentModal } = useContext(CalendarContext);

  useEffect(() => {
    if (showNewAppointmentModal) {
      setIsModalOpen(true);
      setShowNewAppointmentModal(false);
    }
  }, [showNewAppointmentModal, setShowNewAppointmentModal]);

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

  const handleNewAppointment = (appointmentData: Omit<Appointment, 'id'>) => {
    const newAppointment: Appointment = {
      ...appointmentData,
      id: Math.random().toString(36).substr(2, 9),
    };
    setAppointments([...appointments, newAppointment]);
  };

  const getDaysInMonth = (date: Date) => {
    const start = startOfWeek(startOfMonth(date));
    const end = endOfWeek(endOfMonth(date));
    return eachDayOfInterval({ start, end });
  };

  const handleDragStart = (event: { active: { data: { current: Appointment } } }) => {
    setActiveAppointment(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const appointmentId = active.id as string;
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment) return;

    const dropData = over.data.current as { date: Date; time?: string };
    if (!dropData) return;

    setAppointments((currentAppointments) => {
      return currentAppointments.map((apt) => {
        if (apt.id === appointmentId) {
          const duration = apt.end.getTime() - apt.start.getTime();
          
          let newStart: Date;
          if (dropData.time) {
            // Week/Day view - use specific time
            newStart = new Date(dropData.date);
            const [hours, minutes] = dropData.time.split(':').map(Number);
            newStart = setHours(newStart, hours);
            newStart = setMinutes(newStart, minutes);
          } else {
            // Month view - preserve original time
            newStart = new Date(dropData.date);
            newStart = setHours(newStart, apt.start.getHours());
            newStart = setMinutes(newStart, apt.start.getMinutes());
          }
          
          const newEnd = new Date(newStart.getTime() + duration);
          
          return {
            ...apt,
            start: newStart,
            end: newEnd,
          };
        }
        return apt;
      });
    });
    
    setActiveAppointment(null);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
  };

  const days = getDaysInMonth(selectedDate);

  return (
    <Paper p="md" radius="sm" withBorder style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Stack gap="md" style={{ height: '100%' }}>
        <CalendarHeader
          selectedDate={selectedDate}
          view={view}
          onViewChange={setView}
          onNewAppointment={() => setIsModalOpen(true)}
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
              onAppointmentClick={handleAppointmentClick}
            />
          ) : view === 'week' ? (
            <WeekCalendar
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              appointments={appointments}
              onAppointmentClick={handleAppointmentClick}
            />
          ) : (
            <DayCalendar
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              appointments={appointments}
              onAppointmentClick={handleAppointmentClick}
            />
          )}
          <DragOverlay>
            {activeAppointment ? (
              <AppointmentItem 
                appointment={activeAppointment}
                isDragging={true}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </Stack>

      <AppointmentModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleNewAppointment}
      />

      <AppointmentDetailsModal
        opened={selectedAppointment !== null}
        onClose={() => setSelectedAppointment(null)}
        appointment={selectedAppointment}
      />
    </Paper>
  );
}