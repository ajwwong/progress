import { Drawer, Stack, TextInput, Button, Group, Text, Select, Box } from '@mantine/core';
import { useState } from 'react';
import { useMedplum } from '@medplum/react';
import { showNotification } from '@mantine/notifications';
import { IconCheck } from '@tabler/icons-react';
import { pronounOptions } from './constants';
import { normalizeErrorString } from '@medplum/core';
import { ContactPoint } from '@medplum/fhirtypes';
interface PatientModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PatientModal({ opened, onClose, onSuccess }: PatientModalProps): JSX.Element {
  const medplum = useMedplum();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pronouns, setPronouns] = useState<string>('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) return;

    try {
      setIsSubmitting(true);
      const newPatient = await medplum.createResource({
        resourceType: 'Patient',
        active: true,
        name: [{
          given: [firstName],
          family: lastName,
        }],
        extension: pronouns ? [{
          url: 'http://hl7.org/fhir/StructureDefinition/individual-pronouns',
          valueString: pronouns
        }] : undefined,
        telecom: [
          ...(email ? [{ system: 'email', value: email }] : []),
          ...(phone ? [{ system: 'phone', value: phone }] : [])
        ] as ContactPoint[]
      });

      showNotification({
        title: 'Success',
        message: 'Patient created successfully',
        color: 'green',
        icon: <IconCheck size={16} />
      });

      // Reset form
      setFirstName('');
      setLastName('');
      setPronouns('');
      setEmail('');
      setPhone('');
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating patient:', error);
      showNotification({
        title: 'Error',
        message: normalizeErrorString(error),
        color: 'red'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={<Text size="lg" fw={500}>New Patient</Text>}
      overlayProps={{ opacity: 0.3, blur: 2 }}
    >
      <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack spacing="sm" p="md" style={{ flex: 1 }}>
          <Group grow>
            <TextInput
              label="First Name"
              placeholder="Enter first name"
              value={firstName}
              onChange={(e) => setFirstName(e.currentTarget.value)}
              required
              disabled={isSubmitting}
            />
            <TextInput
              label="Last Name"
              placeholder="Enter last name"
              value={lastName}
              onChange={(e) => setLastName(e.currentTarget.value)}
              required
              disabled={isSubmitting}
            />
          </Group>

          <Select
            label="Pronouns"
            placeholder="Select pronouns"
            value={pronouns}
            onChange={(value) => setPronouns(value || '')}
            data={pronounOptions}
            disabled={isSubmitting}
          />

          <TextInput
            label="Email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            type="email"
            disabled={isSubmitting}
          />

          <TextInput
            label="Phone"
            placeholder="Enter phone number"
            value={phone}
            onChange={(e) => setPhone(e.currentTarget.value)}
            disabled={isSubmitting}
          />
        </Stack>

        <Box p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
          <Group justify="flex-end">
            <Button 
              variant="light" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={!firstName.trim() || !lastName.trim()}
            >
              Create Patient
            </Button>
          </Group>
        </Box>
      </Box>
    </Drawer>
  );
}