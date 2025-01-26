import { Stack, Group, Text, Button, TextInput, Paper, Collapse } from '@mantine/core';
import { IconPlus, IconUserCheck, IconMicrophone } from '@tabler/icons-react';
import { AsyncAutocomplete, ResourceAvatar, useMedplum } from '@medplum/react';
import { Patient } from '@medplum/fhirtypes';
import { getDisplayString } from '@medplum/core';
import { useState, useEffect } from 'react';
import { showNotification } from '@mantine/notifications';
import { useTemplates } from '../templates/hooks/useTemplates';

interface PatientSelectorProps {
  onSelect: (patient: Patient) => void;
  onTemplateLoad?: (templateId: string | undefined) => void;
  initialPatient?: Patient;
  context?: 'appointment' | 'audio' | 'notes';
}

export function PatientSelector({ 
  onSelect, 
  onTemplateLoad,
  initialPatient,
  context = 'appointment'
}: PatientSelectorProps) {
  const medplum = useMedplum();
  const { getPatientDefaultTemplate } = useTemplates();
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
      loadPatientTemplate(initialPatient);
    }
  }, [initialPatient, onSelect]);

  const loadPatientTemplate = async (patient: Patient) => {
    if (!onTemplateLoad) return;
    
    try {
      const template = await getPatientDefaultTemplate(patient.id!);
      onTemplateLoad(template?.id);
    } catch (error) {
      console.error('Error loading patient template:', error);
    }
  };

  const handlePatientSelect = async (patient: Patient) => {
    onSelect(patient);
    setSelectedPatient(patient);
    await loadPatientTemplate(patient);
  };

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

      handlePatientSelect(newPatient);
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
      <Paper p="sm" bg={context === 'audio' ? 'blue.1' : 'blue.0'}>
        <Group>
          {getContextIcon()}
          <Stack gap={0}>
            <Text size="sm" fw={500}>{getContextText()}</Text>
            <Text size="sm">{getDisplayString(selectedPatient)}</Text>
            {context === 'audio' && (
              <Text size="xs" c="dimmed">Ready to start recording</Text>
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
      <AsyncAutocomplete
        name="patient"
        placeholder="Search for a patient..."
        loadOptions={async (input: string) => {
          if (!input) return [];
          return await medplum.searchResources('Patient', `name:contains=${input}`);
        }}
        toOption={(patient: Patient) => ({
          value: patient.id as string,
          label: getDisplayString(patient),
          resource: patient
        })}
        onChange={(patients) => {
          if (patients?.[0]) {
            handlePatientSelect(patients[0].resource as Patient);
          }
        }}
      />
      <Collapse in={showNewForm}>
        <Stack gap="sm">
          <TextInput
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <TextInput
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <Group>
            <Button
              size="sm"
              onClick={handleCreatePatient}
              loading={isSubmitting}
              disabled={!firstName.trim() || !lastName.trim()}
            >
              Create Patient
            </Button>
            <Button
              size="sm"
              variant="light"
              onClick={() => setShowNewForm(false)}
            >
              Cancel
            </Button>
          </Group>
        </Stack>
      </Collapse>
      {!showNewForm && (
        <Button
          size="sm"
          variant="light"
          leftSection={<IconPlus size={16} />}
          onClick={() => setShowNewForm(true)}
        >
          New Patient
        </Button>
      )}
    </Stack>
  );
}
