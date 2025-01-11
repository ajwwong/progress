import { Modal, Button, Group, Text, Stack, Select, Badge, Anchor, Paper, ActionIcon } from '@mantine/core';
import { DatePickerInput, TimeInput } from '@mantine/dates';
import { format, parse } from 'date-fns';
import type { Appointment } from '../types/calendar';
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

  const handleDelete = async () => {
    try {
      await medplum.deleteResource('Appointment', editableAppointment.id);
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
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleCloseAttempt}
        title={
          <Group>
            <Text fw={500}>Patient:</Text>
            <Link 
              to={`/Patient/${appointment.patientId}/details`}
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
              <Group position="apart">
                <Text fw={500}>Status</Text>
                <Select
                  value={editableAppointment.status}
                  onChange={(value) => handleFieldChange({ status: value })}
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
              onClick={() => setDeleteModalOpened(true)}
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
          <Stack>
            <Text>Are you sure you want to delete this appointment? It will be permanently removed.</Text>
            <Group justify="flex-end" mt="xl">
              <Button variant="light" onClick={() => setDeleteModalOpened(false)}>Cancel</Button>
              <Button color="red" onClick={handleDelete}>Delete</Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={showUnsavedWarning}
          onClose={() => setShowUnsavedWarning(false)}
          title="Unsaved Changes"
          size="sm"
        >
          <Stack>
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
      </Modal>
    </>
  );
}