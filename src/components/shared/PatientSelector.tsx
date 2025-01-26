import { Stack, Group, Text, Button, TextInput, Paper, Collapse } from '@mantine/core';
import { IconPlus, IconUserCheck, IconMicrophone } from '@tabler/icons-react';
import { AsyncAutocomplete, ResourceAvatar, useMedplum } from '@medplum/react';
import { Patient } from '@medplum/fhirtypes';
import { getDisplayString } from '@medplum/core';
import { useState, useEffect } from 'react';
import { showNotification } from '@mantine/notifications';

interface PatientSelectorProps {
  onSelect: (patient: Patient) => void;
  initialPatient?: Patient;
  context?: 'appointment' | 'audio' | 'notes';
  disabled?: boolean;
}

export function PatientSelector({ 
  onSelect, 
  initialPatient,
  context = 'appointment',
  disabled = false
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

  const getContextIcon = () => {
    if (context === 'audio' && selectedPatient && !justCreated) {
      return <IconMicrophone size={16} color="var(--mantine-color-blue-6)" />;
    }
    return <ResourceAvatar value={selectedPatient} />;
  };

  if (selectedPatient && !justCreated) {
    return (
      <Paper p="sm" bg={context === 'audio' ? 'blue.1' : 'blue.0'} style={{ opacity: disabled ? 0.6 : 1 }}>
        <Group>
          {getContextIcon()}
          <Stack gap={0}>
            <Text size="sm" fw={500}>{getContextText()}</Text>
            <Text size="sm">{getDisplayString(selectedPatient)}</Text>
            {context === 'audio' && (
              <Text size="xs" c="dimmed">
                {disabled ? 'Recording in progress...' : 'Ready to start recording'}
              </Text>
            )}
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
      <Group align="center" mb={4}>
        <Text size="sm" fw={500}>Patient</Text>
        {!showNewForm && (
          <Button 
            variant="subtle" 
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => setShowNewForm(true)}
            disabled={disabled}
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
              disabled={isSubmitting || disabled}
            />
            <TextInput
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.currentTarget.value)}
              required
              disabled={isSubmitting || disabled}
            />
          </Group>
          <Group justify="flex-end">
            <Button 
              variant="light" 
              onClick={() => setShowNewForm(false)}
              disabled={isSubmitting || disabled}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePatient}
              loading={isSubmitting}
              disabled={!firstName.trim() || !lastName.trim() || disabled}
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
          disabled={disabled}
        />
      )}
    </Stack>
  );
}
