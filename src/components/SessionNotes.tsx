import { Title, Paper, Stack, Text, Group, Button, ActionIcon, Loader } from '@mantine/core';
import { Document, useMedplum, useMedplumProfile } from '@medplum/react';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Composition } from '@medplum/fhirtypes';
import { IconEdit, IconPlus } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

export function SessionNotes(): JSX.Element {
  const { id } = useParams();
  const medplum = useMedplum();
  const [compositions, setCompositions] = useState<{ [key: string]: Composition[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (id) {
      medplum.searchResources('Composition', {
        subject: `Patient/${id}`,
        _sort: '-date',
        _count: 100
      })
        .then(results => {
          // Log all raw compositions first
          console.log('All compositions found:', JSON.stringify(results, null, 2));
          
          // Group compositions by type
          const groupedComps: { [key: string]: Composition[] } = {};
          results.forEach(comp => {
            const typeDisplay = comp.type?.coding?.[0]?.display || 
                              comp.type?.text || 
                              'Other Notes';
            if (!groupedComps[typeDisplay]) {
              groupedComps[typeDisplay] = [];
            }
            groupedComps[typeDisplay].push(comp);
            
            // Log each composition's details
            console.log(`Composition ${comp.id} details:`, {
              type: typeDisplay,
              date: comp.date,
              title: comp.title,
              sections: comp.section?.map(s => ({
                title: s.title,
                content: s.text?.div
              }))
            });
          });
          
          // Log final grouped structure
          console.log('Grouped compositions:', JSON.stringify(groupedComps, null, 2));
          setCompositions(groupedComps);
        })
        .catch(err => {
          console.error('Error fetching compositions:', err);
          setError('Error loading notes');
        })
        .finally(() => setLoading(false));
    }
  }, [medplum, id]);

  if (loading) {
    return (
      <Document>
        <Stack align="center" spacing="md">
          <Loader />
          <Text>Loading all patient notes...</Text>
        </Stack>
      </Document>
    );
  }

  if (error) {
    return (
      <Document>
        <Paper p="xl" radius="md" withBorder sx={(theme) => ({
          backgroundColor: theme.colors.red[0],
          borderColor: theme.colors.red[3]
        })}>
          <Title order={2} color="red">{error}</Title>
        </Paper>
      </Document>
    );
  }

  return (
    <Document>
      <Stack spacing="xl">
        <Group position="apart">
          <Title order={2}>All Patient Notes</Title>
          <Button 
            leftIcon={<IconPlus size={16} />}
            component="a"
            href="/transcribe"
          >
            New Note
          </Button>
        </Group>

        {Object.entries(compositions).map(([type, notes]) => (
          <Stack key={type} spacing="md">
            <Title order={3} sx={(theme) => ({
              backgroundColor: theme.colors.gray[1],
              padding: theme.spacing.md,
              borderRadius: theme.radius.sm
            })}>
              {type} ({notes.length})
            </Title>

            {notes.map((note) => (
              <Paper key={note.id} p="xl" radius="md" withBorder>
                <Group position="apart" mb="lg">
                  <Stack spacing={4}>
                    <Title order={4}>{note.title || 'Untitled Note'}</Title>
                    <Text size="sm" color="dimmed">
                      {new Date(note.date || '').toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </Text>
                  </Stack>
                  <Button
                    component={Link}
                    to={`/composition/${note.id}`}
                    variant="light"
                    leftIcon={<IconEdit size={16} />}
                  >
                    View/Edit
                  </Button>
                </Group>

                {note.section?.map((section, index) => (
                  <Paper key={index} withBorder p="md" radius="md" mb="md">
                    <Title order={5} mb="md">
                      {section.title}
                    </Title>
                    <Text style={{ whiteSpace: 'pre-wrap' }}>
                      {section.text?.div?.replace(/<[^>]*>/g, '').trim() || ''}
                    </Text>
                  </Paper>
                ))}
              </Paper>
            ))}
          </Stack>
        ))}
      </Stack>
    </Document>
  );
}