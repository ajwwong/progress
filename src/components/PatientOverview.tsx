import { Box, Title, Paper, Group, Stack, Text } from '@mantine/core';
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

  useEffect(() => {
    if (id) {
      // Fetch patient data
      medplum.readResource('Patient', id)
        .then(setPatient)
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
          <Title order={3} mb="md">Client Information</Title>
          <Group grow>
            <Stack spacing="xs">
              <Text size="sm" c="dimmed">Demographics</Text>
              <Group spacing="lg">
                <Box>
                  <Text size="sm" c="dimmed">Age</Text>
                  <Text>{patient.birthDate ? calculateAgeString(patient.birthDate) : 'N/A'}</Text>
                </Box>
                <Box>
                  <Text size="sm" c="dimmed">Sex</Text>
                  <Text>{patient.gender || 'N/A'}</Text>
                </Box>
                <Box>
                  <Text size="sm" c="dimmed">Gender Identity</Text>
                  <Text>{patient.gender || 'N/A'}</Text>
                </Box>
              </Group>
            </Stack>
            
            <Stack spacing="xs">
              <Text size="sm" c="dimmed">Contact Information</Text>
              {patient.telecom?.map((contact, index) => (
                <Group key={index}>
                  <Text size="sm" c="dimmed">{contact.system}:</Text>
                  <Text>{contact.value}</Text>
                </Group>
              ))}
            </Stack>
          </Group>
        </Paper>
      </Stack>
    </Document>
  );
}