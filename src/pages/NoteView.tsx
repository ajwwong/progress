import { Composition, Patient } from '@medplum/fhirtypes';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Box, Container, Text, Title, Textarea, Button, Group, Drawer, Paper, Stack, Divider, Collapse, Tooltip, ActionIcon, Radio } from '@mantine/core';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { IconWand, IconCopy, IconCheck, IconEdit, IconBook, IconLock, IconRefresh } from '@tabler/icons-react';
import { MantineTheme } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { MagicEditModal } from '../components/notes/MagicEditModal';

export function NoteView(): JSX.Element {
  const { id } = useParams();
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const [composition, setComposition] = useState<Composition>();
  const [error, setError] = useState<string>();
  const [editedSections, setEditedSections] = useState<{ [key: string]: string }>({});
  const [modifiedSections, setModifiedSections] = useState<Set<string>>(new Set());
  const [sectionTimestamps, setSectionTimestamps] = useState<{ [key: string]: string }>({});
  const [showMagicModal, setShowMagicModal] = useState(false);
  const [currentSection, setCurrentSection] = useState<string>('');
  const [isTranscriptVisible, setIsTranscriptVisible] = useState(false);
  const [justCopied, setJustCopied] = useState<string>('');
  const [patient, setPatient] = useState<Patient>();
  const [selectedPronoun, setSelectedPronoun] = useState<string | undefined>(undefined);
  const [selectedIdentifier, setSelectedIdentifier] = useState<string | undefined>(undefined);
  const [selectedQuotes, setSelectedQuotes] = useState<string | undefined>(undefined);
  const [selectedLength, setSelectedLength] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (id) {
      medplum.readResource('Composition', id)
        .then(comp => {
          const authorRef = comp.author?.[0]?.reference;
          const profileRef = `Practitioner/${profile?.id}`;
          
          if (authorRef === profileRef) {
            setComposition(comp);
            if (comp.subject) {
              medplum.readReference(comp.subject).then(pat => setPatient(pat as Patient));
            }
            const sections: { [key: string]: string } = {};
            const timestamps: { [key: string]: string } = {};
            comp.section?.forEach((section) => {
              sections[section.title || ''] = section.text?.div?.replace(/<[^>]*>/g, '') || '';
              timestamps[section.title || ''] = comp.date || new Date().toISOString();
            });
            setEditedSections(sections);
            setSectionTimestamps(timestamps);
          } else {
            setError('You do not have permission to view this composition');
          }
        })
        .catch(err => setError('Error loading composition'));
    }
  }, [medplum, id, profile]);

  const handleSignNote = async () => {
    if (!composition) return;
  
    const updatedComposition: Composition = {
      ...composition,
      status: 'final' as const,
      date: new Date().toISOString(),
      attester: [{
        mode: 'legal',
        time: new Date().toISOString(),
        party: {
          reference: `Practitioner/${profile?.id}`
        }
      }]
    };
  
    try {
      const result = await medplum.updateResource(updatedComposition);
      setComposition(result as Composition);
    } catch (err) {
      setError('Error signing note');
    }
  };
  
  const handleSaveSection = async (sectionTitle: string) => {
    if (!composition) return;

    const updatedComposition: Composition = {
      ...composition,
      section: composition.section?.map(section => {
        if (section.title === sectionTitle) {
          return {
            ...section,
            text: {
              div: editedSections[sectionTitle],
              status: 'generated' as const
            }
          };
        }
        return section;
      })
    };

    try {
      const result = await medplum.updateResource(updatedComposition);
      setComposition(result as Composition);
      setSectionTimestamps(prev => ({
        ...prev,
        [sectionTitle]: new Date().toISOString()
      }));
      setModifiedSections(prev => {
        const next = new Set(prev);
        next.delete(sectionTitle);
        return next;
      });
    } catch (err) {
      setError('Error saving changes');
    }
  };

  const handleCopySection = (text: string, sectionTitle: string) => {
    navigator.clipboard.writeText(text);
    setJustCopied(sectionTitle);
    setTimeout(() => setJustCopied(''), 2000);
  };

  const handleTextChange = (sectionTitle: string, newText: string) => {
    setEditedSections(prev => ({
      ...prev,
      [sectionTitle]: newText
    }));
    setModifiedSections(prev => {
      const next = new Set(prev);
      next.add(sectionTitle);
      return next;
    });
  };

  const handleRegenerate = async () => {
    if (!composition || !editedSections['Transcript']) return;
    
    try {
      const transcript = editedSections['Transcript'];
      const prompt = `As an experienced psychodynamically-oriented therapist, please generate a comprehensive psychotherapy note based on the following session transcript. The note should be thorough, clinically precise, and reflect deep therapeutic insight.

Please structure the note with these sections:
1. Subjective & History
2. Mental Status Exam
3. Assessment & Plan

Transcript:
${transcript}

Return the note as a JSON object with this exact format:
{
  "sections": [
    {
      "title": "section title",
      "content": "section content"
    }
  ]
}`;

      const response = await medplum.executeBot(
        '5731008c-42a6-4fdc-8969-2560667b4f1d',
        { text: prompt },
        'application/json'
      );

      if (response.text) {
        try {
          const jsonMatch = response.text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('No JSON found in response');
          
          const noteContent = JSON.parse(jsonMatch[0]);
          
          if (!noteContent?.sections) throw new Error('Invalid note format');
          
          // Update each section in the composition
          noteContent.sections.forEach((section: { title: string, content: string }) => {
            handleTextChange(section.title, section.content);
          });

          showNotification({
            title: 'Note Regenerated',
            message: 'The clinical note has been regenerated successfully.',
            color: 'green'
          });
        } catch (parseErr) {
          throw new Error('Failed to parse regenerated note');
        }
      }
    } catch (err) {
      setError('Error regenerating note');
      showNotification({
        title: 'Error',
        message: 'Failed to regenerate note',
        color: 'red'
      });
    }
  };

  const handleUnlock = async () => {
    if (!composition) return;
    
    const updatedComposition: Composition = {
      ...composition,
      status: 'preliminary' as const,
      attester: undefined
    };

    try {
      const result = await medplum.updateResource(updatedComposition);
      setComposition(result as Composition);
    } catch (err) {
      setError('Error unlocking note');
    }
  };

  if (error) {
    return (
      <Container size="md" mt="xl">
        <Paper 
          p="xl" 
          radius="md" 
          withBorder 
          style={(theme: MantineTheme) => ({
            backgroundColor: theme.colors.red[0],
            borderColor: theme.colors.red[3]
          })}
        >
          <Title order={2} c="red">{error}</Title>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="md" mt="xl">
      <Stack gap="lg">
        <Paper p="xl" radius="md" withBorder>
          <Box mb="md">
            <Title order={2} c="blue.8">Clinical Notes</Title>
            <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
              Therapeutic Progress Documentation
            </Text>
          </Box>
          
          <Stack gap="md">
            {error && (
              <Text c="red.6">{error}</Text>
            )}
            
            <Stack gap="md">
              {composition?.section?.map((section, index) => {
                const sectionTitle = section.title || '';
                const sectionText = editedSections[sectionTitle] || '';
                const isModified = modifiedSections.has(sectionTitle);
                const isTranscript = sectionTitle === 'Transcript';
                
                if (isTranscript && !isTranscriptVisible) {
                  return (
                    <Text
                      key={index}
                      size="lg"
                      fw={500}
                      mb="lg"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setIsTranscriptVisible(true)}
                    >
                      Show Transcript
                    </Text>
                  );
                }

                if (isTranscript) {
                  return (
                    <Paper
                      key={index}
                      withBorder
                      p="md"
                      radius="md"
                      mb="lg"
                      bg="white"
                    >
                      <Group justify="space-between" mb="md">
                        <Title order={3}>{sectionTitle}</Title>
                        <Group gap="xs">
                          <Button
                            onClick={() => handleCopySection(sectionText, sectionTitle)}
                            variant={justCopied === sectionTitle ? "filled" : "light"}
                            color={justCopied === sectionTitle ? "teal" : "blue"}
                            size="sm"
                            leftSection={justCopied === sectionTitle ? <IconCheck size={16} /> : <IconCopy size={16} />}
                          >
                            {justCopied === sectionTitle ? "Copied!" : "Copy"}
                          </Button>
                          <Button
                            onClick={() => setIsTranscriptVisible(false)}
                            variant="subtle"
                            size="sm"
                          >
                            Hide Transcript
                          </Button>
                        </Group>
                      </Group>

                      <Textarea
                        value={sectionText}
                        readOnly
                        minRows={5}
                        autosize
                        mt="md"
                      />
                    </Paper>
                  );
                }

                return (
                  <Paper
                    key={index}
                    withBorder
                    p="md"
                    radius="md"
                    mb="lg"
                    bg="white"
                  >
                    <Group justify="space-between" mb="md">
                      <Title order={3}>{sectionTitle}</Title>
                      <Group gap="xs">
                        <Tooltip label="Magic Edit">
                          <ActionIcon
                            onClick={() => {
                              setCurrentSection(sectionTitle);
                              setShowMagicModal(true);
                            }}
                            variant="light"
                            color="violet"
                            size="lg"
                            disabled={!!composition?.attester?.[0]}
                          >
                            <IconWand size={20} />
                          </ActionIcon>
                        </Tooltip>
                        <Button
                          onClick={() => handleCopySection(sectionText, sectionTitle)}
                          variant={justCopied === sectionTitle ? "filled" : "light"}
                          color={justCopied === sectionTitle ? "teal" : "blue"}
                          size="sm"
                          leftSection={justCopied === sectionTitle ? <IconCheck size={16} /> : <IconCopy size={16} />}
                        >
                          {justCopied === sectionTitle ? "Copied!" : "Copy"}
                        </Button>
                        {isModified && (
                          <Button
                            onClick={() => handleSaveSection(sectionTitle)}
                            variant="light"
                            color="red"
                            size="sm"
                            leftSection={<IconEdit size={16} />}
                          >
                            Save Changes
                          </Button>
                        )}
                        {sectionTitle === 'Psychotherapy Note' && !composition?.attester?.[0] && (
                          <Button
                            onClick={handleRegenerate}
                            color="blue"
                            size="sm"
                            leftSection={<IconRefresh size={16} />}
                          >
                            Regenerate Note
                          </Button>
                        )}
                      </Group>
                    </Group>

                    <Text size="sm" c="dimmed" mb="md" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      Last modified: {new Date(sectionTimestamps[sectionTitle] || composition?.date || '').toLocaleString()}
                      {composition?.attester?.[0] && <IconLock size={16} />}
                    </Text>

                    <Textarea
                      value={sectionText}
                      onChange={(e) => handleTextChange(sectionTitle, e.target.value)}
                      minRows={5}
                      autosize
                      mt="md"
                      readOnly={!!composition?.attester?.[0]}
                    />
                  </Paper>
                );
              })}
            </Stack>
          </Stack>
        </Paper>

        <MagicEditModal
          opened={showMagicModal}
          onClose={() => setShowMagicModal(false)}
          onEdit={(editedText) => {
            handleTextChange(currentSection, editedText);
          }}
          currentContent={editedSections[currentSection] || ''}
          transcriptContent={editedSections['Transcript']}
          sectionTitle={currentSection}
        />
      </Stack>
    </Container>
  );
}