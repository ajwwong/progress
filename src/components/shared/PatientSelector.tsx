import { Stack, Group, Text, Button, TextInput, Paper, Collapse } from '@mantine/core';
import { IconPlus, IconUserCheck } from '@tabler/icons-react';
import { AsyncAutocomplete, ResourceAvatar, useMedplum } from '@medplum/react';
import { Patient } from '@medplum/fhirtypes';
import { getDisplayString } from '@medplum/core';
import { useState, useEffect } from 'react';
import { showNotification } from '@mantine/notifications';

interface PatientSelectorProps {
  onSelect: (patient: Patient) => void;
  initialPatient?: Patient;
  context?: 'appointment' | 'audio' | 'notes';
}

export function PatientSelector({ 
  onSelect, 
  initialPatient,
  context = 'appointment'
}: PatientSelectorProps) {
  const medplum = useMedplum();
  const [showNewForm, setShowNewForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justCreated, setJustCreated] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined>(initialPatient);

  useEffect(() => {
    if (initialPatient) {
      onSelect(initialPatient);
      setSelectedPatient(initialPatient);
    }
  }, [initialPatient, onSelect]);

  const handleCreatePatient = async () => {
    if (!firstName.trim() || !lastName.trim()) return;

    try {
      setIsSubmitting(true);
      const newPatient = await medplum.createResource({
        resourceType: 'Patient',
        name: [{
          given: [firstName],
          family: lastName,
        }],
        active: true
      });

      onSelect(newPatient);
      setJustCreated(true);
      setShowNewForm(false);
      showNotification({
        title: 'Success',
        message: 'Patient created successfully',
        color: 'green'
      });
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to create patient',
        color: 'red'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getContextText = () => {
    switch (context) {
      case 'appointment':
        return 'Scheduling Appointment for';
      case 'audio':
        return 'Recording Session for';
      case 'notes':
        return 'Creating Note for';
      default:
        return 'Selected Patient';
    }
  };

  if (selectedPatient && !justCreated) {
    return (
      <Paper p="sm" bg="blue.0">
        <Group>
          <ResourceAvatar value={selectedPatient} />
          <Stack gap={0}>
            <Text size="sm" fw={500}>{getContextText()}</Text>
            <Text size="sm">{getDisplayString(selectedPatient)}</Text>
          </Stack>
        </Group>
      </Paper>
    );
  }

  if (justCreated) {
    return (
      <Paper p="sm" bg="green.0">
        <Group>
          <IconUserCheck size={20} color="var(--mantine-color-green-6)" />
          <Stack gap={0}>
            <Text size="sm" fw={500}>New Patient Created</Text>
            <Text size="sm">{firstName} {lastName}</Text>
          </Stack>
        </Group>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      <Group align="center" mb="xs">
        <Text size="sm" fw={500}>Patient</Text>
        {!showNewForm && (
          <Button 
            variant="subtle" 
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => setShowNewForm(true)}
          >
            New Patient
          </Button>
        )}
      </Group>

      <Collapse in={showNewForm} transitionDuration={400} transitionTimingFunction="ease">
        <Stack gap="sm">
          <Group grow>
            <TextInput
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.currentTarget.value)}
              required
              disabled={isSubmitting}
            />
            <TextInput
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.currentTarget.value)}
              required
              disabled={isSubmitting}
            />
          </Group>
          <Group justify="flex-end">
            <Button 
              variant="light" 
              onClick={() => setShowNewForm(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePatient}
              loading={isSubmitting}
              disabled={!firstName.trim() || !lastName.trim()}
            >
              Create Patient
            </Button>
          </Group>
        </Stack>
      </Collapse>

      {!showNewForm && (
        <AsyncAutocomplete
          placeholder="Search by patient name..."
          loadOptions={async (input, signal) => {
            if (!input) return [];
            return await medplum.searchResources('Patient', `name:contains=${input}`, { signal });
          }}
          toOption={(patient) => ({
            value: patient.id as string,
            label: getDisplayString(patient),
            resource: patient,
          })}
          itemComponent={({ resource }: { resource: Patient }) => (
            <Group wrap="nowrap">
              <ResourceAvatar value={resource} />
              <Text>{getDisplayString(resource)}</Text>
            </Group>
          )}
          onChange={(patients) => {
            if (patients?.[0]) {
              onSelect(patients[0]);
              setSelectedPatient(patients[0]);
            }
          }}
          maxValues={1}
          required
        />
      )}
    </Stack>
  );
}
