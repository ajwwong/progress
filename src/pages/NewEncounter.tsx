import { Container, Title, TextInput, Textarea, Button, Stack, Select, Group, Text } from '@mantine/core';
import { useMedplum } from '@medplum/react';
import { showNotification } from '@mantine/notifications';
import { IconCircleCheck, IconCircleOff } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { normalizeErrorString } from '@medplum/core';
import { Encounter } from '@medplum/fhirtypes';

export function NewEncounter(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const encounter: Encounter = {
        resourceType: 'Encounter',
        status: 'planned',
        class: {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: formData.get('encounterType') as string,
          display: formData.get('encounterType') as string
        },
        type: [{
          text: formData.get('title') as string
        }],
        reasonCode: [{
          text: formData.get('reason') as string
        }],
        subject: {
          reference: `Patient/${formData.get('patientId')}`,
          display: formData.get('patientName') as string
        }
      };

      const result = await medplum.createResource(encounter);

      showNotification({
        title: 'Success',
        message: 'Encounter created successfully',
        color: 'green',
        icon: <IconCircleCheck />
      });

      // Navigate to the new encounter
      navigate(`/encounter/${result.id}`);
    } catch (error) {
      showNotification({
        title: 'Error',
        message: normalizeErrorString(error),
        color: 'red',
        icon: <IconCircleOff />
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <form onSubmit={handleSubmit}>
        <Stack spacing="lg">
          <div>
            <Title order={2}>New Encounter</Title>
            <Text c="dimmed">Create a new patient encounter</Text>
          </div>

          <TextInput
            required
            label="Patient ID"
            name="patientId"
            placeholder="Enter patient ID"
          />

          <TextInput
            required
            label="Patient Name"
            name="patientName"
            placeholder="Enter patient name"
          />

          <TextInput
            required
            label="Title"
            name="title"
            placeholder="Enter encounter title"
          />

          <Select
            required
            label="Encounter Type"
            name="encounterType"
            placeholder="Select encounter type"
            data={[
              { value: 'AMB', label: 'Ambulatory' },
              { value: 'EMER', label: 'Emergency' },
              { value: 'FLD', label: 'Field' },
              { value: 'HH', label: 'Home Health' },
              { value: 'IMP', label: 'Inpatient' },
              { value: 'ACUTE', label: 'Inpatient Acute' },
              { value: 'NONAC', label: 'Inpatient Non-Acute' },
              { value: 'OBSENC', label: 'Observation Encounter' },
              { value: 'PRENC', label: 'Pre-Admission' },
              { value: 'SS', label: 'Short Stay' },
              { value: 'VR', label: 'Virtual' }
            ]}
          />

          <Textarea
            label="Reason"
            name="reason"
            placeholder="Enter reason for encounter"
            minRows={3}
          />

          <Group position="right" mt="md">
            <Button variant="subtle" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Encounter
            </Button>
          </Group>
        </Stack>
      </form>
    </Container>
  );
}
