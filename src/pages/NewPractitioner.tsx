import { Container, Title, TextInput, Button, Stack, Select, Group, Text, MultiSelect } from '@mantine/core';
import { useMedplum } from '@medplum/react';
import { showNotification } from '@mantine/notifications';
import { IconCircleCheck, IconCircleOff } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { normalizeErrorString } from '@medplum/core';
import { Practitioner } from '@medplum/fhirtypes';

export function NewPractitioner(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const practitioner: Practitioner = {
        resourceType: 'Practitioner',
        active: true,
        name: [{
          use: 'official',
          family: formData.get('lastName') as string,
          given: [formData.get('firstName') as string],
        }],
        telecom: [
          {
            system: 'email',
            value: formData.get('email') as string,
            use: 'work'
          },
          {
            system: 'phone',
            value: formData.get('phone') as string,
            use: 'work'
          }
        ],
        qualification: [{
          code: {
            text: formData.get('specialty') as string
          }
        }],
        communication: (formData.get('languages') as string).split(',').map(lang => ({
          coding: [{
            system: 'urn:ietf:bcp:47',
            code: lang.trim()
          }]
        }))
      };

      const result = await medplum.createResource(practitioner);

      showNotification({
        title: 'Success',
        message: 'Practitioner created successfully',
        color: 'green',
        icon: <IconCircleCheck />
      });

      navigate(`/practitioner/${result.id}`);
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
        <Stack gap="xl">
          <div>
            <Title order={2}>New Practitioner</Title>
            <Text c="dimmed">Add a new practitioner to your practice</Text>
          </div>

          <TextInput
            required
            label="First Name"
            name="firstName"
            placeholder="Enter first name"
          />

          <TextInput
            required
            label="Last Name"
            name="lastName"
            placeholder="Enter last name"
          />

          <TextInput
            required
            label="Email"
            name="email"
            type="email"
            placeholder="Enter email address"
          />

          <TextInput
            label="Phone"
            name="phone"
            placeholder="Enter phone number"
          />

          <Select
            required
            label="Specialty"
            name="specialty"
            placeholder="Select specialty"
            data={[
              'Psychotherapy',
              'Counseling',
              'Clinical Psychology',
              'Psychiatry',
              'Marriage and Family Therapy',
              'Social Work',
              'Mental Health Counseling',
              'Addiction Counseling'
            ]}
          />

          <MultiSelect
            label="Languages"
            name="languages"
            placeholder="Select languages"
            data={[
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Spanish' },
              { value: 'fr', label: 'French' },
              { value: 'de', label: 'German' },
              { value: 'zh', label: 'Chinese' },
              { value: 'ar', label: 'Arabic' },
              { value: 'hi', label: 'Hindi' },
              { value: 'pt', label: 'Portuguese' }
            ]}
            defaultValue={['en']}
          />

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Practitioner
            </Button>
          </Group>
        </Stack>
      </form>
    </Container>
  );
}
