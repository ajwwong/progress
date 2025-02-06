import { 
  Paper, 
  Group, 
  Title, 
  Button, 
  Stack, 
  Box, 
  Text, 
  SimpleGrid, 
  Select,
  TextInput 
} from '@mantine/core';
import { IconEdit, IconCheck, IconPhone, IconMail } from '@tabler/icons-react';
import { Document, ResourceTable, useMedplum } from '@medplum/react';
import { useParams } from 'react-router-dom';
import { Patient, Composition } from '@medplum/fhirtypes';
import { calculateAgeString } from '@medplum/core';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';

interface FormData {
  phone: string;
  email: string;
  birthDate: string;
  pronouns: string;
  defaultTemplate: string;
  gender: string;
}

export function PatientOverview(): JSX.Element {
  const { id } = useParams();
  const medplum = useMedplum();
  const [patient, setPatient] = useState<Patient>();
  const [latestNote, setLatestNote] = useState<Composition>();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    birthDate: '',
    gender: '',
    phone: '',
    email: '',
    defaultTemplate: '',
    pronouns: ''
  });

  useEffect(() => {
    if (id) {
      // Fetch patient data
      medplum.readResource('Patient', id)
        .then((p) => {
          setPatient(p);
          setFormData({
            birthDate: p.birthDate || '',
            gender: p.gender || '',
            phone: p.telecom?.find(t => t.system === 'phone')?.value || '',
            email: p.telecom?.find(t => t.system === 'email')?.value || '',
            defaultTemplate: '',
            pronouns: ''
          });
        })
        .catch(console.error);

      // Fetch latest progress note
      medplum.searchResources('Composition', {
        subject: `Patient/${id}`,
        _sort: '-date',
        _count: '1'
      })
        .then(results => {
          console.log('Fetched compositions:', results);
          if (results[0]?.section?.[0]?.text?.div) {
            // Create a div element and set its innerHTML to the content
            const contentDiv = document.createElement('div');
            contentDiv.innerHTML = results[0].section[0].text.div;
            // Get the text content
            const textContent = contentDiv.textContent || 'No content available';
            results[0].section[0].text = { div: textContent, status: 'generated' };
          }
          setLatestNote(results[0]);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [medplum, id]);

  if (!patient) {
    return <Text>Loading...</Text>;
  }

  return (
    <Document>
      <Stack gap="xl">
        {/* Client Information Panel */}
        <Paper p="xl" radius="md" withBorder>
          <Group justify="space-between" mb="xl">
            <Title order={3}>Client Information</Title>
            <Group>
              <Button 
                variant="subtle" 
                size="sm"
                leftSection={isEditing ? <IconCheck size={16} /> : <IconEdit size={16} />}
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Save' : 'Edit'}
              </Button>
            </Group>
          </Group>

          <Stack gap="xl">
            {/* Contact Information Section */}
            <Box>
              <Text fw={500} c="dimmed" size="sm" mb="md">Contact Information</Text>
              <SimpleGrid cols={2} spacing="lg">
                <TextInput
                  label="Phone"
                  leftSection={<IconPhone size={16} />}
                  placeholder="(555) 555-5555"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={!isEditing}
                />
                <TextInput
                  label="Email"
                  leftSection={<IconMail size={16} />}
                  placeholder="client@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={!isEditing}
                />
              </SimpleGrid>
            </Box>

            {/* Note Template Section */}
            <Box>
              <Text fw={500} c="dimmed" size="sm" mb="md">Documentation Preferences</Text>
              <Select
                label="Default Note Template"
                placeholder="Select default template"
                value={formData.defaultTemplate}
                onChange={(value) => setFormData(prev => ({ ...prev, defaultTemplate: value || '' }))}
                data={[
                  { value: 'initial', label: 'Initial Assessment' },
                  { value: 'progress', label: 'Progress Note' },
                  { value: 'discharge', label: 'Discharge Summary' }
                ]}
                disabled={!isEditing}
              />
            </Box>

            {/* Demographics Section */}
            <Box>
              <Text fw={500} c="dimmed" size="sm" mb="md">Demographics</Text>
              <SimpleGrid cols={2} spacing="lg">
                <TextInput
                  label="Date of Birth"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    birthDate: e.target.value
                  }))}
                  disabled={!isEditing}
                />
                <Select
                  label="Pronouns"
                  placeholder="Select pronouns"
                  value={formData.pronouns}
                  onChange={(value) => setFormData(prev => ({ ...prev, pronouns: value || '' }))}
                  data={[
                    { value: 'he/him', label: 'He/Him' },
                    { value: 'she/her', label: 'She/Her' },
                    { value: 'they/them', label: 'They/Them' }
                  ]}
                  disabled={!isEditing}
                />
              </SimpleGrid>
            </Box>
          </Stack>
        </Paper>
      </Stack>
    </Document>
  );
}