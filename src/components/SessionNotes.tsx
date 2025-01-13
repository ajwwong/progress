import { Title, Paper, Stack, Text, Group, Button, ActionIcon } from '@mantine/core';
import { Document, useMedplum } from '@medplum/react';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Composition } from '@medplum/fhirtypes';
import { IconEdit, IconPlus } from '@tabler/icons-react';

export function SessionNotes(): JSX.Element {
  const { id } = useParams();
  const medplum = useMedplum();
  const [notes, setNotes] = useState<Composition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      medplum.searchResources('Composition', {
        subject: `Patient/${id}`,
        type: '11488-4', // LOINC code for Consultation note
        _sort: '-date',
      })
        .then(setNotes)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [medplum, id]);

  return (
    <Document>
      <Stack spacing="xl">
        <Group position="apart">
          <Title order={2}>Session Notes</Title>
          <Button 
            leftIcon={<IconPlus size={16} />}
            component="a"
            href="/transcribe"
          >
            New Note
          </Button>
        </Group>

        {notes.map((note) => (
          <Paper key={note.id} p="md" withBorder>
            <Group position="apart" mb="md">
              <Stack spacing={0}>
                <Text fw={500}>{note.title}</Text>
                <Text size="sm" c="dimmed">
                  {new Date(note.date || '').toLocaleDateString()}
                </Text>
              </Stack>
              <ActionIcon 
                variant="light"
                component="a"
                href={`/composition/${note.id}`}
              >
                <IconEdit size={16} />
              </ActionIcon>
            </Group>
            {note.section?.map((section, index) => (
              <div key={index}>
                <Text fw={500} mt="md" mb="xs">{section.title}</Text>
                <Text>{section.text?.div?.replace(/<[^>]*>/g, '')}</Text>
              </div>
            ))}
          </Paper>
        ))}
      </Stack>
    </Document>
  );
}