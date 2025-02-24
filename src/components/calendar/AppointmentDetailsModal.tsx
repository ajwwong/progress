import { Modal, Button, Group, Text, Stack, Select, Badge, Anchor, Paper, ActionIcon } from '@mantine/core';
import { DatePickerInput, TimeInput } from '@mantine/dates';
import { format, parse } from 'date-fns';
import type { Appointment } from '../../types/calendar';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { IconTrash } from '@tabler/icons-react';
import { useMedplum } from '@medplum/react';
import { showNotification } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import { DateTimeSelector } from './appointment/DateTimeSelector';
import { addMinutesToTime, getTimeDifferenceInMinutes } from './appointment/timeUtils';

interface AppointmentDetailsModalProps {
  opened: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onSave: (updatedAppointment: Appointment) => void;
  onDelete?: () => void;
}

export function AppointmentDetailsModal({ opened, onClose, appointment, onSave, onDelete }: AppointmentDetailsModalProps) {
  if (!appointment) return null;

  const navigate = useNavigate();
  const [editableAppointment, setEditableAppointment] = useState(appointment);
  const [date, setDate] = useState<Date>(appointment.start);
  const [startTime, setStartTime] = useState<string>(format(appointment.start, 'HH:mm'));
  const [endTime, setEndTime] = useState<string>(format(appointment.end, 'HH:mm'));
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [defaultInterval, setDefaultInterval] = useState<number>(() => 
    getTimeDifferenceInMinutes(
      format(appointment.start, 'HH:mm'),
      format(appointment.end, 'HH:mm')
    )
  );
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);

  const medplum = useMedplum();

  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  };

  const handleFieldChange = (updates: Partial<Appointment>) => {
    setEditableAppointment(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const handleCloseAttempt = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    try {
      const startParsed = parseTime(startTime);
      const endParsed = parseTime(endTime);

      const updatedStart = new Date(date);
      updatedStart.setHours(startParsed.hours, startParsed.minutes);

      const updatedEnd = new Date(date);
      updatedEnd.setHours(endParsed.hours, endParsed.minutes);

      const updatedAppointment = {
        ...editableAppointment,
        start: updatedStart,
        end: updatedEnd,
        title: `${editableAppointment.type} - ${editableAppointment.patientName}`,
      };

      console.log('Saving appointment:', updatedAppointment);
      
      if (typeof onSave !== 'function') {
        console.error('onSave is not a function');
        return;
      }

      onSave(updatedAppointment);
      console.log('Appointment saved successfully');
      setHasUnsavedChanges(false);
      onClose();
    } catch (error) {
      console.error('Error saving appointment:', error);
    }
  };

  const handleDelete = async (deleteOption?: 'single' | 'future' | 'all') => {
    try {
      if (editableAppointment.seriesId) {
        if (!deleteOption) {
          setShowDeleteOptions(true);
          setDeleteModalOpened(false);
          return;
        }

        if (deleteOption === 'single') {
          // Just delete this single appointment
          await medplum.deleteResource('Appointment', editableAppointment.id);
        } else {
          // Get all appointments in series
          const searchResponse = await medplum.search('Appointment', {
            identifier: `http://terminology.hl7.org/CodeSystem/appointment-series|${editableAppointment.seriesId}`
          });

          const allAppointments = searchResponse.entry
            ?.map(e => e.resource as any)
            ?.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

          if (allAppointments) {
            for (const apt of allAppointments) {
              if (deleteOption === 'all' || 
                 (deleteOption === 'future' && new Date(apt.start) >= editableAppointment.start)) {
                await medplum.deleteResource('Appointment', apt.id);
              }
            }
          }
        }
      } else {
        // Handle single appointment delete
        await medplum.deleteResource('Appointment', editableAppointment.id);
      }

      showNotification({
        title: 'Success',
        message: 'Appointment deleted successfully',
        icon: <IconCheck size={16} />,
        color: 'green'
      });
      onClose();
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to delete appointment',
        icon: <IconX size={16} />,
        color: 'red'
      });
    }
    setDeleteModalOpened(false);
    setShowDeleteOptions(false);
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleCloseAttempt}
        title={
          <Group justify="flex-start">
            <Text fw={500}>Patient:</Text>
            <Link 
              to={`/Patient/${appointment.patientId}/profile`}
              style={{ 
                color: 'var(--mantine-color-blue-6)',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
            >
              {appointment.patientName}
            </Link>
          </Group>
        }
        size="md"
      >
        <Stack gap="md">
          <Paper withBorder p="md">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={500}>Status</Text>
                <Select
                  value={editableAppointment.status}
                  onChange={(value) => handleFieldChange({ status: value as 'booked' | 'cancelled' | 'noshow' })}
                  data={[
                    { value: 'booked', label: 'Show' },
                    { value: 'cancelled', label: 'Cancelled' },
                    { value: 'noshow', label: 'No Show' }
                  ]}
                  styles={(theme) => ({
                    input: {
                      fontWeight: 500,
                      textTransform: 'capitalize'
                    }
                  })}
                />
              </Group>

              <Text fw={500} mt="md">Appointment Details</Text>
              
              <Select
                label="Type"
                data={[
                  { value: 'ROUTINE', label: 'Intake Therapy' },
                  { value: 'FOLLOWUP', label: 'Follow-up Therapy' }
                ]}
                value={editableAppointment.type}
                onChange={(value) => handleFieldChange({ type: value as 'ROUTINE' | 'FOLLOWUP' })}
              />

              <DateTimeSelector
                date={date}
                startTime={startTime}
                endTime={endTime}
                defaultInterval={defaultInterval}
                onDateChange={(newDate) => {
                  if (newDate) {
                    setDate(newDate);
                    handleFieldChange({ start: newDate });
                  }
                }}
                onStartTimeChange={(newTime) => {
                  setStartTime(newTime);
                  const newEndTime = addMinutesToTime(newTime, defaultInterval);
                  setEndTime(newEndTime);
                  
                  const [startHours, startMinutes] = newTime.split(':').map(Number);
                  const startDate = new Date(date);
                  startDate.setHours(startHours, startMinutes);
                  
                  const [endHours, endMinutes] = newEndTime.split(':').map(Number);
                  const endDate = new Date(date);
                  endDate.setHours(endHours, endMinutes);
                  
                  handleFieldChange({ 
                    start: startDate,
                    end: endDate 
                  });
                }}
                onEndTimeChange={(newTime) => {
                  setEndTime(newTime);
                  if (startTime) {
                    const newInterval = getTimeDifferenceInMinutes(startTime, newTime);
                    setDefaultInterval(newInterval);
                    
                    const [hours, minutes] = newTime.split(':').map(Number);
                    const endDate = new Date(date);
                    endDate.setHours(hours, minutes);
                    handleFieldChange({ end: endDate });
                  }
                }}
                onIntervalChange={(minutes) => {
                  setDefaultInterval(minutes);
                  if (startTime) {
                    const newEndTime = addMinutesToTime(startTime, minutes);
                    setEndTime(newEndTime);
                    
                    const [hours, mins] = newEndTime.split(':').map(Number);
                    const endDate = new Date(date);
                    endDate.setHours(hours, mins);
                    handleFieldChange({ end: endDate });
                  }
                }}
              />
            </Stack>
          </Paper>

          <Group justify="space-between" mt="xl">
            <ActionIcon 
              color="red" 
              size="lg" 
              variant="light"
              onClick={() => {
                if (editableAppointment.seriesId) {
                  handleDelete();  // This will show the options modal
                } else {
                  setDeleteModalOpened(true);  // Show regular delete confirmation for single appointments
                }
              }}
            >
              <IconTrash size={20} />
            </ActionIcon>
            <Button onClick={handleSave}>Save Changes</Button>
          </Group>
        </Stack>

        <Modal
          opened={deleteModalOpened}
          onClose={() => setDeleteModalOpened(false)}
          title="Delete Appointment"
          size="sm"
        >
          <Stack gap="md">
            <Text>Are you sure you want to delete this appointment? It will be permanently removed.</Text>
            <Group justify="flex-end" mt="xl">
              <Button variant="light" onClick={() => setDeleteModalOpened(false)}>Cancel</Button>
              <Button color="red" onClick={() => handleDelete()}>Delete</Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={showUnsavedWarning}
          onClose={() => setShowUnsavedWarning(false)}
          title="Unsaved Changes"
          size="sm"
        >
          <Stack gap="md">
            <Text>You have unsaved changes. Would you like to save them before closing?</Text>
            <Group justify="flex-end" mt="xl">
              <Button variant="light" onClick={() => {
                setShowUnsavedWarning(false);
                setHasUnsavedChanges(false);
                onClose();
              }}>
                Discard Changes
              </Button>
              <Button onClick={() => {
                handleSave();
                setShowUnsavedWarning(false);
                setHasUnsavedChanges(false);
              }}>
                Save Changes
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={showDeleteOptions}
          onClose={() => setShowDeleteOptions(false)}
          title="Delete Recurring Appointment"
          size="sm"
        >
          <Stack gap="md">
            <Text>How would you like to delete this recurring appointment?</Text>
            <Button 
              variant="light" 
              onClick={() => handleDelete('single')}
            >
              Delete Only This Appointment
            </Button>
            <Button 
              variant="light" 
              onClick={() => handleDelete('future')}
            >
              Delete This and Future Appointments
            </Button>
            <Button 
              color="red" 
              onClick={() => handleDelete('all')}
            >
              Delete All Appointments in Series
            </Button>
            <Button 
              variant="subtle" 
              onClick={() => setShowDeleteOptions(false)}
            >
              Cancel
            </Button>
          </Stack>
        </Modal>
      </Modal>
    </>
  );
}