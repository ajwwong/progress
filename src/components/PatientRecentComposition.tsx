import { 
  Paper, 
  Group, 
  Title, 
  Stack, 
  Box, 
  Text 
} from '@mantine/core';
import { Document, useMedplum } from '@medplum/react';
import { useParams } from 'react-router-dom';
import { Patient, Composition } from '@medplum/fhirtypes';
import { useState, useEffect } from 'react';

interface Narrative {
  status: 'generated' | 'extensions' | 'additional' | 'empty';
  div: string;
}

const narrative: Narrative = {
  status: 'generated',
  div: '<div>Content</div>'
};

export function PatientRecentComposition(): JSX.Element {
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
        subject: `Patient/${id}`,
        _sort: '-date',
        _count: '1'
      })
        .then(results => {
          if (results[0]?.section?.[0]?.text?.div) {
            const contentDiv = document.createElement('div');
            contentDiv.innerHTML = results[0].section[0].text.div;
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
        <Paper p="md" radius="md" withBorder>
          <Title order={3} mb="md">Latest Progress Note</Title>
          {latestNote ? (
            <Stack gap="xs">
              <Group justify="apart">
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
              {latestNote.section
                ?.filter(section => section.title !== 'Transcript')
                ?.map((section, index) => (
                <Box key={index}>
                  {section.title && <Text fw={500}>{section.title}</Text>}
                  {section.text?.div && (
                    <Text style={{ whiteSpace: 'pre-wrap' }}>
                      {typeof section.text.div === 'string' 
                        ? section.text.div
                          .replace(/<div xmlns="http:\/\/www\.w3\.org\/1999\/xhtml">/g, '')
                          .replace(/<\/div>/g, '')
                          .trim()
                        : ''}
                    </Text>
                  )}
                </Box>
              ))}
            </Stack>
          ) : (
            <Text c="dimmed">No progress notes available</Text>
          )}
        </Paper>
      </Stack>
    </Document>
  );
}