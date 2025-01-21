import { Composition, Patient } from '@medplum/fhirtypes';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Box, Container, Text, Title, Textarea, Button, Group, Drawer, Paper, Stack, Divider, Collapse, Tooltip, ActionIcon, Radio } from '@mantine/core';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { IconWand, IconCopy, IconCheck, IconEdit, IconBook, IconLock } from '@tabler/icons-react';
import { MantineTheme } from '@mantine/core';

export function NoteView(): JSX.Element {
  const { id } = useParams();
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const [composition, setComposition] = useState<Composition>();
  const [error, setError] = useState<string>();
  const [editedSections, setEditedSections] = useState<{ [key: string]: string }>({});
  const [modifiedSections, setModifiedSections] = useState<Set<string>>(new Set());
  const [sectionTimestamps, setSectionTimestamps] = useState<{ [key: string]: string }>({});
  const [showMagicDrawer, setShowMagicDrawer] = useState(false);
  const [magicInstructions, setMagicInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
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

  useEffect(() => {
    if (!showMagicDrawer) {
      clearSelections();
    }
  }, [showMagicDrawer]);

  const handleSignNote = async () => {
    if (!composition) return;
  
    const updatedComposition = {
      ...composition,
      status: 'final',
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
      setComposition(result);
    } catch (err) {
      setError('Error signing note');
    }
  };
  
  const handleSaveSection = async (sectionTitle: string) => {
    if (!composition) return;

    const updatedComposition = {
      ...composition,
      section: composition.section?.map(section => {
        if (section.title === sectionTitle) {
          return {
            ...section,
            text: {
              div: editedSections[sectionTitle],
              status: 'generated'
            }
          };
        }
        return section;
      })
    };

    try {
      const result = await medplum.updateResource(updatedComposition);
      setComposition(result);
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

  const clearSelections = () => {
    setSelectedPronoun(undefined);
    setSelectedIdentifier(undefined);
    setSelectedQuotes(undefined);
    setSelectedLength(undefined);
    setMagicInstructions('');
  };

  const handleMagicEdit = async (sectionTitle: string) => {
    if (!composition || sectionTitle !== 'Psychotherapy Note') return;
    
    setIsProcessing(true);
    try {
      const currentNote = editedSections['Psychotherapy Note'];
      const transcript = editedSections['Transcript'];
      const prompt = `As an experienced psychodynamically-oriented therapist, please adjust the following psychotherapy note according to these instructions:

${magicInstructions}

Current note:
${currentNote}

Original transcript for reference:
${transcript}

Please provide the complete adjusted note while maintaining the same professional therapeutic style and structure.`;

      const response = await medplum.executeBot(
        '5731008c-42a6-4fdc-8969-2560667b4f1d',
        { text: prompt },
        'application/json'
      );

      if (response.text) {
        handleTextChange(sectionTitle, response.text);
        setShowMagicDrawer(false);
        clearSelections();
      }
    } catch (err) {
      setError('Error processing magic edit');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlock = async () => {
    if (!composition) return;
    
    const updatedComposition = {
      ...composition,
      status: 'preliminary',
      attester: undefined
    };

    try {
      const result = await medplum.updateResource(updatedComposition);
      setComposition(result);
    } catch (err) {
      setError('Error unlocking note');
    }
  };

  if (error) {
    return (
      <Container size="md" mt="xl">
        <Paper p="xl" radius="md" withBorder sx={(theme) => ({
          backgroundColor: theme.colors.red[0],
          borderColor: theme.colors.red[3]
        })}>
          <Title order={2} color="red">{error}</Title>
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
                            onClick={() => setShowMagicDrawer(true)}
                            variant="light"
                            color="violet"
                            size="lg"
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

        <Drawer
          opened={showMagicDrawer}
          onClose={() => setShowMagicDrawer(false)}
          title={<Title order={3} c="blue.8">Magic Edit</Title>}
          position="right"
          size="sm"
          padding="lg"
        >
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Choose quick edit options or provide custom instructions below
            </Text>

            <Box>
              <Text fw={500} size="sm" mb="xs">Pronouns</Text>
              <Radio.Group
                value={selectedPronoun}
                onChange={(value) => {
                  setSelectedPronoun(value === selectedPronoun ? undefined : value);
                  const instructions = {
                    'she': "Change all pronouns to she/her",
                    'he': "Change all pronouns to he/him",
                    'they': "Change all pronouns to they/their"
                  }[value];
                  setMagicInstructions(instructions || '');
                }}
              >
                <Group>
                  <Radio label="She/Her" value="she" />
                  <Radio label="He/Him" value="he" />
                  <Radio label="They/Their" value="they" />
                </Group>
              </Radio.Group>
            </Box>

            <Box>
              <Text fw={500} size="sm" mb="xs">Identifier</Text>
              <Radio.Group
                value={selectedIdentifier}
                onChange={(value) => {
                  setSelectedIdentifier(value === selectedIdentifier ? undefined : value);
                  const instructions = {
                    'patient': "Change all references to use 'patient'",
                    'client': "Change all references to use 'client'",
                    'name': "Use the client's actual name instead of 'patient' or 'client'"
                  }[value];
                  setMagicInstructions(instructions || '');
                }}
              >
                <Group>
                  <Radio label="Patient" value="patient" />
                  <Radio label="Client" value="client" />
                  <Radio label="Name" value="name" />
                </Group>
              </Radio.Group>
            </Box>

            <Box>
              <Text fw={500} size="sm" mb="xs">Quotes</Text>
              <Radio.Group
                value={selectedQuotes}
                onChange={(value) => {
                  setSelectedQuotes(value === selectedQuotes ? undefined : value);
                  const instructions = {
                    'remove': "Remove direct quotes and paraphrase the content professionally",
                    'add': "Add quotes around direct client statements"
                  }[value];
                  setMagicInstructions(instructions || '');
                }}
              >
                <Group>
                  <Radio label="Remove Quotes" value="remove" />
                  <Radio label="Add Quotes" value="add" />
                </Group>
              </Radio.Group>
            </Box>

            <Box>
              <Text fw={500} size="sm" mb="xs">Length</Text>
              <Radio.Group
                value={selectedLength}
                onChange={(value) => {
                  setSelectedLength(value === selectedLength ? undefined : value);
                  const instructions = {
                    'concise': "Make the note more concise while maintaining key clinical information",
                    'detail': "Expand the note with more detail and clinical observations"
                  }[value];
                  setMagicInstructions(instructions || '');
                }}
              >
                <Group>
                  <Radio label="Make Concise" value="concise" />
                  <Radio label="Add Detail" value="detail" />
                </Group>
              </Radio.Group>
            </Box>

            <Divider my="sm" />
            
            <Text size="sm" fw={500}>Custom Instructions</Text>
            <Textarea
              value={magicInstructions}
              onChange={(e) => setMagicInstructions(e.target.value)}
              placeholder="Example: Make the language more professional and expand on the cognitive behavioral interventions used"
              minRows={5}
              autosize
            />

            <Group justify="flex-end">
              <Button
                onClick={() => setShowMagicDrawer(false)}
                variant="subtle"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleMagicEdit('Psychotherapy Note')}
                loading={isProcessing}
              >
                Apply Magic Edit
              </Button>
            </Group>
          </Stack>
        </Drawer>
      </Stack>
    </Container>
  );
}