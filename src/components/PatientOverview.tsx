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
}

export function PatientOverview(): JSX.Element {
  const { id } = useParams();
  const medplum = useMedplum();
  const [patient, setPatient] = useState<Patient>();
  const [latestNote, setLatestNote] = useState<Composition>();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    birthDate: '',
    gender: '',
    phone: '',
    email: '',
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
            results[0].section[0].text = { div: textContent };
          }
          setLatestNote(results[0]);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [medplum, id]);

  const handleBasicClone = async () => {
    try {
      // Check if we're running against localhost
      const isLocalhost = medplum.getBaseUrl().includes('localhost');
      if (!isLocalhost) {
        notifications.show({
          title: 'Bot Not Available',
          message: 'Basic Clone is only available when running against a local Medplum server. ' +
                  'You are currently running against app.medplum.com. ' +
                  'To use this feature, please run your own Medplum server locally.',
          color: 'yellow'
        });
        return;
      }

      console.log('Executing basic-clone bot...');
      const result = await medplum.executeBot(
        'ec2096af-861b-4c84-994f-7ef11b6546d8',
        {
          resourceType: 'Parameters',
          parameter: [
            {
              name: 'input',
              resource: patient
            },
            {
              name: 'resourceTypes',
              valueString: '*'
            }
          ]
        }
      );
      console.log('Bot execution result:', result);
      
      // Check if the result indicates an error
      if (result.status === 'error') {
        console.error('Bot execution debug log:', result.debugLog);
        console.error('Bot execution error details:', result.details);
        throw new Error(result.message || 'Clone operation failed');
      }

      notifications.show({
        title: 'Success',
        message: 'Basic clone completed successfully',
        color: 'green'
      });
    } catch (err) {
      console.error('Error executing bot:', err);
      
      // Handle bot execution result error
      if (err && typeof err === 'object' && 'status' in err && err.status === 'error') {
        const botError = err as { status: string; message: string; details: any; debugLog: string[] };
        console.error('Bot execution debug log:', botError.debugLog);
        console.error('Bot execution details:', botError.details);
        notifications.show({
          title: 'Error',
          message: `Clone failed: ${botError.message}. Check console for details.`,
          color: 'red'
        });
        return;
      }

      // Handle HTTP response error
      const error = err as { response?: Response };
      if (error.response) {
        const text = await error.response.text();
        console.error('Error response:', text);
        try {
          const outcome = JSON.parse(text) as OperationOutcome;
          notifications.show({
            title: 'Error',
            message: outcome.issue?.[0]?.diagnostics || 'Failed to execute basic clone',
            color: 'red'
          });
        } catch {
          notifications.show({
            title: 'Error',
            message: text || 'Failed to execute basic clone',
            color: 'red'
          });
        }
      } else {
        notifications.show({
          title: 'Error',
          message: err instanceof Error ? err.message : 'Failed to execute basic clone',
          color: 'red'
        });
      }
    }
  };

  if (!patient) {
    return <Text>Loading...</Text>;
  }

  return (
    <Document>
      <Stack spacing="xl">


        {/* Client Information Panel */}
        <Paper p="xl" radius="md" withBorder>
          <Group position="apart" mb="xl">
            <Title order={3}>Client Information</Title>
            <Button 
              variant="subtle" 
              size="sm"
              leftIcon={isEditing ? <IconCheck size={16} /> : <IconEdit size={16} />}
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Save' : 'Edit'}
            </Button>
          </Group>

          <Stack spacing="xl">
            {/* Contact Information Section */}
            <Box>
              <Text size="sm" weight={500} color="dimmed" mb="md">Contact Information</Text>
              <SimpleGrid cols={2} spacing="lg">
                <TextInput
                  label="Phone"
                  icon={<IconPhone size={16} />}
                  placeholder="(555) 555-5555"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={!isEditing}
                />
                <TextInput
                  label="Email"
                  icon={<IconMail size={16} />}
                  placeholder="client@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={!isEditing}
                />
              </SimpleGrid>
            </Box>

            {/* Note Template Section */}
            <Box>
              <Text size="sm" weight={500} color="dimmed" mb="md">Documentation Preferences</Text>
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
              <Text size="sm" weight={500} color="dimmed" mb="md">Demographics</Text>
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