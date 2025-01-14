import { Modal, Button, Group, TextInput, Select, Checkbox, Stack, Text, Anchor } from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import { DatePickerInput } from '@mantine/dates';
import { Users, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Appointment } from '../../types/calendar';

interface AppointmentModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (appointment: Omit<Appointment, 'id'>) => void;
}

const appointmentTypes = [
  { value: 'checkup', label: 'Checkup' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'followup', label: 'Follow-up' },
] as const;

const locations = [
  { value: 'online', label: 'Online Services' },
  { value: 'office', label: 'Main Office' },
  { value: 'branch', label: 'Branch Clinic' },
] as const;

export function AppointmentModal({ opened, onClose, onSave }: AppointmentModalProps) {
  const [appointmentType, setAppointmentType] = useState<'individual' | 'group'>('individual');
  const [date, setDate] = useState<Date | null>(new Date());
  const [startTime, setStartTime] = useState<Date | null>(new Date());
  const [endTime, setEndTime] = useState<Date | null>(new Date());
  const [isAllDay, setIsAllDay] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [type, setType] = useState<typeof appointmentTypes[number]['value']>('checkup');
  const [location, setLocation] = useState(locations[0].value);

  // Load the selected date when the modal opens
  useEffect(() => {
    if (opened) {
      const selectedDate = localStorage.getItem('selectedAppointmentDate');
      if (selectedDate) {
        setDate(new Date(selectedDate));
        localStorage.removeItem('selectedAppointmentDate');
      }
    }
  }, [opened]);

  const handleSave = () => {
    if (!date || !startTime || !endTime || !patientName) return;

    const start = new Date(date);
    start.setHours(startTime.getHours(), startTime.getMinutes());

    const end = new Date(date);
    end.setHours(endTime.getHours(), endTime.getMinutes());

    onSave({
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} - ${patientName}`,
      start,
      end,
      patientName,
      type,
      status: 'scheduled',
    });

    onClose();
  };

  const handleCreateClient = () => {
    onClose();
    // Find and click the New button
    const newButton = document.querySelector('button[aria-label="New"]') as HTMLButtonElement;
    if (newButton) {
      newButton.click();
      // Wait for the menu to appear and click the New Client option
      setTimeout(() => {
        const newClientItem = document.querySelector('#new-client') as HTMLElement;
        if (newClientItem) {
          newClientItem.click();
        }
      }, 100);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="New Appointment"
      size="lg"
    >
      <Stack gap="md">
        <Group gap="sm">
          <Button
            variant={appointmentType === 'individual' ? 'filled' : 'light'}
            onClick={() => setAppointmentType('individual')}
            leftSection={<User size={16} />}
          >
            Individual or couple
          </Button>
          <Button
            variant={appointmentType === 'group' ? 'filled' : 'light'}
            onClick={() => setAppointmentType('group')}
            leftSection={<Users size={16} />}
          >
            Group
          </Button>
        </Group>

        <Stack gap="xs">
          <TextInput
            label="Patient Name"
            placeholder="Enter patient name"
            value={patientName}
            onChange={(e) => setPatientName(e.currentTarget.value)}
            required
          />
          <Group gap="xs">
            <Text size="sm" c="dimmed">New patient?</Text>
            <Anchor size="sm" onClick={handleCreateClient}>
              Create Client
            </Anchor>
          </Group>
        </Stack>

        <Group grow>
          <Select
            label="Appointment Type"
            data={appointmentTypes}
            value={type}
            onChange={(value: typeof type) => setType(value)}
            required
          />
          <Select
            label="Location"
            data={locations}
            value={location}
            onChange={(value: string) => setLocation(value)}
            required
          />
        </Group>

        <DatePickerInput
          label="Date"
          value={date}
          onChange={setDate}
          required
        />

        <Checkbox
          label="All day"
          checked={isAllDay}
          onChange={(e) => setIsAllDay(e.currentTarget.checked)}
        />

        {!isAllDay && (
          <Group grow>
            <TimeInput
              label="Start Time"
              value={startTime}
              onChange={setStartTime}
              required
            />
            <TimeInput
              label="End Time"
              value={endTime}
              onChange={setEndTime}
              required
            />
          </Group>
        )}

        <Checkbox
          label="Recurring"
          checked={isRecurring}
          onChange={(e) => setIsRecurring(e.currentTarget.checked)}
        />

        <Group justify="flex-end" mt="xl">
          <Button variant="light" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Done</Button>
        </Group>
      </Stack>
    </Modal>
  );
}