import { Accordion, Box, Button, Collapse, Group, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { Document, useMedplum, useMedplumProfile } from '@medplum/react';
import { useParams } from 'react-router-dom';
import { Composition } from '@medplum/fhirtypes';
import { IconEdit, IconPlus, IconArrowRight, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export function SessionNotes(): JSX.Element {
  const { id } = useParams();
  const medplum = useMedplum();
  const [compositions, setCompositions] = useState<{ [key: string]: Composition[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set());

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

  const toggleNote = (noteId: string) => {
    setOpenNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  return (
    <Document>
      <Stack spacing="xl">
        <Group position="apart">
          <Title order={2}>All Patient Notes</Title>
          <Button 
            component="a"
            href="/transcribe"
          >
            <Group spacing={8}>
              <IconChevronRight size={16} />
              <span>New Note</span>
            </Group>
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
            
            <Stack spacing="md">
              {notes.map((note) => (
                <Paper key={note.id} withBorder>
                  <Group p="md" position="apart" onClick={() => toggleNote(note.id || '')} sx={{ cursor: 'pointer' }}>
                    <Group>
                      {openNotes.has(note.id || '') ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                      <Text weight={500}>{note.title}</Text>
                    </Group>
                    <Text size="sm" color="dimmed">
                      {new Date(note.date || '').toLocaleString()}
                    </Text>
                  </Group>
                  
                  <Collapse in={openNotes.has(note.id || '')}>
                    <Box p="md">
                      {note.section
                        ?.filter(section => section.title !== 'Transcript')
                        ?.map((section, index) => (
                        <Box key={index} mb="md">
                          <Text weight={500} mb="xs">{section.title}</Text>
                          <Paper p="md" withBorder>
                            <div 
                              dangerouslySetInnerHTML={{ 
                                __html: section.text?.div || '' 
                              }}
                              style={{
                                whiteSpace: 'pre-wrap'
                              }}
                            />
                          </Paper>
                        </Box>
                      ))}
                    </Box>
                  </Collapse>
                </Paper>
              ))}
            </Stack>
          </Stack>
        ))}
      </Stack>
    </Document>
  );
}