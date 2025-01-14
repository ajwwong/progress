import { Box, Title, Paper, Group, Stack, Text, Button, Grid, Select, TextInput } from '@mantine/core';
import { Document, ResourceTable, useMedplum } from '@medplum/react';
import { useParams } from 'react-router-dom';
import { Patient, Composition } from '@medplum/fhirtypes';
import { calculateAgeString } from '@medplum/core';
import { useState, useEffect } from 'react';

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
        patient: `Patient/${id}`,
        type: 'progress-note',
        _sort: '-date',
        _count: '1'
      })
        .then(results => setLatestNote(results[0]))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [medplum, id]);

  if (!patient) {
    return <Text>Loading...</Text>;
  }

  return (
    <Document>
      <Stack spacing="xl">
        {/* Latest Progress Note */}
        <Paper p="md" radius="md" withBorder>
          <Title order={3} mb="md">Latest Progress Note</Title>
          {latestNote ? (
            <Stack spacing="xs">
              <Group position="apart">
                <Text fw={500}>
                  {new Date(latestNote.date || '').toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <Text size="sm" c="dimmed">Status: {latestNote.status}</Text>
              </Group>
              <Text>{latestNote.title}</Text>
              {latestNote.section?.map((section, index) => (
                <Box key={index}>
                  {section.title && <Text fw={500}>{section.title}</Text>}
                  <Text>{section.text}</Text>
                </Box>
              ))}
            </Stack>
          ) : (
            <Text c="dimmed">No progress notes available</Text>
          )}
        </Paper>

        {/* Client Information Panel */}
        <Paper p="md" radius="md" withBorder>
          <Group position="apart" mb="md">
            <Title order={3}>Client Information</Title>
            <Button 
              variant="subtle" 
              size="xs" 
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Save' : 'Edit'}
            </Button>
          </Group>

          <Group grow>
            <Stack spacing="xs">
              <Title order={4} size="h5">Demographics</Title>
              <Grid>
                <Grid.Col span={6}>
                  <TextInput
                    label="Date of Birth"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                    disabled={!isEditing}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Select
                    label="Sex"
                    value={formData.gender}
                    onChange={(value) => setFormData(prev => ({ ...prev, gender: value || '' }))}
                    data={[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'other', label: 'Other' }
                    ]}
                    disabled={!isEditing}
                  />
                </Grid.Col>
              </Grid>
            </Stack>
            
            <Stack spacing="xs">
              <Title order={4} size="h5">Contact Information</Title>
              <Grid>
                <Grid.Col span={6}>
                  <TextInput
                    label="Phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!isEditing}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!isEditing}
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Group>
        </Paper>
      </Stack>
    </Document>
  );
}