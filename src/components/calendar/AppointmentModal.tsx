import { Modal, Button, Group, Stack, Title } from '@mantine/core';
import { Patient } from '@medplum/fhirtypes';
import { PatientSelector } from '../shared/PatientSelector';
import { DateTimeSelector } from './appointment/DateTimeSelector';
import { AppointmentTypeSelector } from './appointment/AppointmentTypeSelector';
import { RecurringOptions } from './appointment/RecurringOptions';
import { useAppointmentForm } from './appointment/useAppointmentForm';
import type { Appointment } from '../../types/calendar';

interface AppointmentModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (appointments: Omit<Appointment, 'id'>[]) => void;
  initialDate?: Date;
  initialPatient?: Patient;
}

export function AppointmentModal({ 
  opened, 
  onClose, 
  onSave, 
  initialDate,
  initialPatient 
}: AppointmentModalProps) {
  console.log('AppointmentModal rendered with initialDate:', initialDate);
  const { 
    state, 
    setState, 
    setStartTime,
    setEndTime,
    setDefaultInterval,
    isValid, 
    generateAppointments, 
    reset 
  } = useAppointmentForm({ initialDate, initialPatient });

  const handleSave = () => {
    const appointments = generateAppointments();
    if (appointments.length > 0) {
      onSave(appointments);
      reset();
      onClose();
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={<Title order={3} fw={500}>New Appointment</Title>}
      size="lg"
      styles={{
        title: {
          marginBottom: '0.1rem'
        },
        body: {
          paddingTop: '0.5rem'
        }
      }}
    >
      <Stack gap="md">
        <PatientSelector 
          onSelect={(patient: Patient) => setState(prev => ({ ...prev, patient }))}
          initialPatient={initialPatient}
          context="appointment"
        />

        <DateTimeSelector
          date={state.date}
          startTime={state.startTime}
          endTime={state.endTime}
          defaultInterval={state.defaultInterval}
          onDateChange={(date) => setState(prev => ({ ...prev, date }))}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
          onIntervalChange={setDefaultInterval}
        />

        <AppointmentTypeSelector
          type={state.type}
          isRecurring={state.isRecurring}
          onTypeChange={(type) => setState(prev => ({ ...prev, type: type as 'ROUTINE' | 'FOLLOWUP' }))}
          onRecurringChange={(isRecurring) => setState(prev => ({ ...prev, isRecurring }))}
        />

        {state.isRecurring && (
          <RecurringOptions
            frequency={state.frequency}
            occurrences={state.occurrences}
            onFrequencyChange={(frequency) => setState(prev => ({ ...prev, frequency }))}
            onOccurrencesChange={(occurrences) => setState(prev => ({ ...prev, occurrences }))}
          />
        )}

        <Group justify="flex-end" mt="xl">
          <Button variant="light" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!isValid()}>
            Create {state.isRecurring ? 'Recurring ' : ''}Appointment{state.isRecurring ? 's' : ''}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}