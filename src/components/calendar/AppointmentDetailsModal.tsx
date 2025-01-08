import { Modal, Button, Group, Text, Stack, Select, Badge, Anchor, Paper } from '@mantine/core';
import { DatePickerInput, TimeInput } from '@mantine/dates';
import { format, parse } from 'date-fns';
import type { Appointment } from '../types/calendar';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

interface AppointmentDetailsModalProps {
  opened: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onSave: (updatedAppointment: Appointment) => void;
}

export function AppointmentDetailsModal({ opened, onClose, appointment, onSave }: AppointmentDetailsModalProps) {
  if (!appointment) return null;

  const navigate = useNavigate();
  const [editableAppointment, setEditableAppointment] = useState(appointment);
  const [date, setDate] = useState<Date>(appointment.start);
  const [startTime, setStartTime] = useState<string>(format(appointment.start, 'HH:mm'));
  const [endTime, setEndTime] = useState<string>(format(appointment.end, 'HH:mm'));

  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  };

  const handlePatientClick = () => {
    console.log('Patient clicked:', appointment.patientId); // Debug log
    if (appointment.patientId) {
      navigate(`/Patient/${appointment.patientId}/details`);
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

      console.log('Saving appointment:', updatedAppointment); // Debug log
      
      if (typeof onSave !== 'function') {
        console.error('onSave is not a function');
        return;
      }

      onSave(updatedAppointment);
      console.log('Appointment saved successfully'); // Debug log
      onClose();
    } catch (error) {
      console.error('Error saving appointment:', error);
    }
  };

  console.log('Appointment data:', {
    patientId: appointment.patientId,
    patientName: appointment.patientName
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <Text fw={500}>Patient:</Text>
          <Link 
            to={`/Patient/${appointment.patientId}`}
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
                onChange={(value) => setEditableAppointment({ ...editableAppointment, status: value })}
                data={[
                  { value: 'scheduled', label: 'Scheduled' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                  { value: 'no show', label: 'No Show' },
                  { value: 'late cancelled', label: 'Late Cancelled' },
                  { value: 'show', label: 'Show' }
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
              data={['intake therapy', 'followup therapy']}
              value={editableAppointment.type}
              onChange={(value) => setEditableAppointment({ ...editableAppointment, type: value })}
            />

            <DatePickerInput
              label="Date"
              value={date}
              onChange={(newDate) => newDate && setDate(newDate)}
            />

            <Group grow>
              <TimeInput
                label="Start Time"
                value={startTime}
                onChange={(e) => setStartTime(e.currentTarget.value)}
                required
              />
              <Text size="sm" mt={28}>to</Text>
              <TimeInput
                label="End Time"
                value={endTime}
                onChange={(e) => setEndTime(e.currentTarget.value)}
                required
              />
            </Group>
          </Stack>
        </Paper>

        <Group justify="flex-end" mt="xl">
          <Button variant="light" color="red">Cancel Appointment</Button>
          <Button variant="light" onClick={onClose}>Close</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </Group>
      </Stack>
    </Modal>
  );
}