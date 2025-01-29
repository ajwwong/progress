import { Composition, Patient } from '@medplum/fhirtypes';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Box, Container, Text, Title, Textarea, Button, Group, Drawer, Paper, Stack, Divider, Collapse, Tooltip, ActionIcon, Radio, Loader, Badge, Anchor } from '@mantine/core';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IconWand, IconCopy, IconCheck, IconEdit, IconBook, IconLock, IconRefresh, IconCalendar } from '@tabler/icons-react';
import { MantineTheme } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { MagicEditModal } from '../components/notes/MagicEditModal';
import { useDisclosure } from '@mantine/hooks';
import { format } from 'date-fns';
import { useCompositions } from '../hooks/useCompositions';

// Autosave debounce time in milliseconds
const AUTOSAVE_DELAY = 2000;

// Add at the top with other constants
const TRANSCRIPT_TITLES = ['transcript', 'session transcript', 'audio transcript', 'recording transcript'];

export function NoteView(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const { triggerUpdate } = useCompositions();
  const [composition, setComposition] = useState<Composition>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  // Autosave timer
  const [autosaveTimer, setAutosaveTimer] = useState<NodeJS.Timeout>();

  const loadComposition = useCallback(async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const comp = await medplum.readResource('Composition', id);
      
      const authorRef = comp.author?.[0]?.reference;
      const profileRef = `Practitioner/${profile?.id}`;
      
      if (authorRef === profileRef) {
        setComposition(comp);
        if (comp.subject) {
          const pat = await medplum.readReference(comp.subject);
          setPatient(pat as Patient);
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
    } catch (err) {
      setError('Error loading composition. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [medplum, id, profile]);

  useEffect(() => {
    loadComposition();
  }, [loadComposition]);

  useEffect(() => {
    const markAsViewed = async () => {
      if (!id) return;
      
      try {
        const composition = await medplum.readResource('Composition', id);
        const extensions = composition.extension || [];
        const existingIndex = extensions.findIndex(ext => 
          ext.url === 'http://example.com/fhir/StructureDefinition/note-viewed'
        );
        
        // Only update if not already viewed
        if (existingIndex === -1) {
          extensions.push({
            url: 'http://example.com/fhir/StructureDefinition/note-viewed',
            valueBoolean: true
          });
          
          // Update on server
          const updatedComposition = await medplum.updateResource({
            ...composition,
            extension: extensions
          });
          
          // Update local state
          setComposition(updatedComposition);
          
          // Trigger update to refresh sidebar UI
          triggerUpdate();
          
          // Broadcast the update to any listeners
          window.dispatchEvent(new CustomEvent('composition-viewed', { 
            detail: { composition: updatedComposition } 
          }));
        }
      } catch (err) {
        console.error('Error marking composition as viewed:', err);
      }
    };

    markAsViewed();
  }, [id, medplum, triggerUpdate]);

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
      showNotification({
        title: 'Note Signed',
        message: 'The note has been signed and finalized',
        color: 'green',
        icon: <IconCheck size={16} />
      });
    } catch (err) {
      setError('Error signing note');
      showNotification({
        title: 'Error',
        message: 'Failed to sign note',
        color: 'red'
      });
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

  const handleTextChange = useCallback((sectionTitle: string, newText: string) => {
    setEditedSections(prev => ({
      ...prev,
      [sectionTitle]: newText
    }));
    setModifiedSections(prev => {
      const next = new Set(prev);
      next.add(sectionTitle);
      return next;
    });

    // Clear existing timer
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
    }

    // Set new autosave timer
    const timer = setTimeout(() => {
      handleSaveSection(sectionTitle);
    }, AUTOSAVE_DELAY);

    setAutosaveTimer(timer);
  }, [autosaveTimer]);

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

  // Add a function to handle patient click
  const handlePatientClick = () => {
    if (patient?.id) {
      navigate(`/patient/${patient.id}`);
    }
  };

  if (isLoading) {
    return (
      <Container size="md" mt="xl">
        <Paper p="xl" radius="md" withBorder>
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text>Loading note...</Text>
          </Stack>
        </Paper>
      </Container>
    );
  }

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
          <Stack gap="md">
            <Title order={2} c="red">{error}</Title>
            <Button 
              variant="light" 
              color="blue" 
              onClick={loadComposition}
            >
              Retry Loading
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="md" mt="xl">
      <Stack gap="lg">
        <Paper 
          p="md" 
          radius="md" 
          withBorder
          style={{
            borderTop: '3px solid var(--mantine-color-blue-4)',
            backgroundColor: 'var(--mantine-color-gray-0)'
          }}
        >
          <Stack gap="md">
            {patient && (
              <Group justify="space-between">
                <Group gap="md">
                  <Group gap="xs">
                    <Title 
                      order={2} 
                      style={{
                        fontFamily: 'var(--mantine-font-family)',
                        color: 'var(--mantine-color-blue-9)',
                        letterSpacing: '-0.3px'
                      }}
                    >
                      <Anchor 
                        onClick={handlePatientClick}
                        style={{ 
                          textDecoration: 'none',
                          cursor: 'pointer',
                          fontSize: 'inherit',
                          fontWeight: 'inherit',
                          color: 'inherit'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        {patient.name?.[0]?.given?.join(' ')} {patient.name?.[0]?.family}
                      </Anchor>
                    </Title>
                    <Badge size="lg" variant="light" color="blue">Patient</Badge>
                  </Group>
                  {composition?.date && (
                    <Group gap="xs">
                      <Divider orientation="vertical" />
                      <Text 
                        fw={500} 
                        size="sm" 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 4,
                          color: 'var(--mantine-color-blue-8)',
                        }}
                      >
                        <IconCalendar size={14} style={{ strokeWidth: 2.5 }} />
                        {format(new Date(composition.date), 'MMM d, yyyy')}
                        <Text span size="xs" c="dimmed" ml={4}>
                          {format(new Date(composition.date), 'h:mm a')}
                        </Text>
                      </Text>
                    </Group>
                  )}
                </Group>
                {composition?.attester?.[0] ? (
                  <Button
                    onClick={handleUnlock}
                    variant="light"
                    color="orange"
                    size="sm"
                    leftSection={<IconLock size={16} style={{ strokeWidth: 2.5 }} />}
                    styles={(theme) => ({
                      root: {
                        transition: 'all 200ms ease',
                        '&:hover': {
                          backgroundColor: theme.colors.orange[1],
                          transform: 'translateY(-1px)'
                        }
                      }
                    })}
                  >
                    Unlock Note
                  </Button>
                ) : (
                  <Button
                    onClick={handleSignNote}
                    variant="light"
                    color="blue"
                    size="sm"
                    leftSection={<IconBook size={16} style={{ strokeWidth: 2.5 }} />}
                    styles={(theme) => ({
                      root: {
                        transition: 'all 200ms ease',
                        '&:hover': {
                          backgroundColor: theme.colors.blue[1],
                          transform: 'translateY(-1px)'
                        }
                      }
                    })}
                  >
                    Sign Note
                  </Button>
                )}
              </Group>
            )}
            <Divider />
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <Title 
                  order={3} 
                  style={{
                    fontFamily: 'var(--mantine-font-family)',
                    color: 'var(--mantine-color-blue-8)',
                    letterSpacing: '-0.3px'
                  }}
                >
                  {composition?.title || 'Untitled Note'}
                </Title>
                <Text size="sm" c="dimmed" style={{ fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {composition?.attester?.[0] ? (
                    <>
                      <IconLock size={14} style={{ strokeWidth: 2.5 }} />
                      Locked on {format(new Date(composition.attester[0].time || ''), 'MMM d, h:mm a')}
                    </>
                  ) : (
                    <>
                      <IconEdit size={14} style={{ strokeWidth: 2.5 }} />
                      Last modified {format(new Date(composition?.date || ''), 'MMM d, h:mm a')}
                    </>
                  )}
                </Text>
                <Badge 
                  size="md"
                  variant="light"
                  color={composition?.attester?.[0] ? "gray" : "yellow"}
                  leftSection={composition?.attester?.[0] ? 
                    <IconLock size={12} style={{ strokeWidth: 2.5 }} /> : 
                    <IconEdit size={12} style={{ strokeWidth: 2.5 }} />
                  }
                  styles={(theme) => ({
                    root: {
                      textTransform: 'none',
                      fontWeight: 500
                    }
                  })}
                >
                  {composition?.attester?.[0] ? 'Signed' : 'Draft'}
                </Badge>
                <Button
                  onClick={() => {
                    const allSections = composition?.section
                      ?.filter(section => !TRANSCRIPT_TITLES.some(title => 
                        (section.title || '').toLowerCase().includes(title)
                      ))
                      ?.map(section => 
                        `${section.title}\n\n${editedSections[section.title || ''] || ''}`
                      ).join('\n\n');
                    if (allSections) {
                      navigator.clipboard.writeText(allSections);
                      setJustCopied('all');
                      showNotification({
                        title: 'Copied',
                        message: 'All sections copied to clipboard',
                        color: 'teal',
                        icon: <IconCheck size={16} />
                      });
                      setTimeout(() => setJustCopied(''), 2000);
                    }
                  }}
                  variant={justCopied === 'all' ? "filled" : "light"}
                  color={justCopied === 'all' ? "teal" : "blue"}
                  size="sm"
                  leftSection={justCopied === 'all' ? 
                    <IconCheck size={14} style={{ strokeWidth: 2.5 }} /> : 
                    <IconCopy size={14} style={{ strokeWidth: 2.5 }} />
                  }
                  styles={(theme) => ({
                    root: {
                      transition: 'all 200ms ease',
                      '&:hover': {
                        backgroundColor: justCopied === 'all' ? theme.colors.teal[6] : theme.colors.blue[1],
                        transform: 'translateY(-1px)'
                      }
                    }
                  })}
                >
                  {justCopied === 'all' ? "Copied!" : "Copy All"}
                </Button>
              </Group>
            </Group>
            {!composition?.attester?.[0] && (
              <Paper p="sm" bg="gray.0" style={{ borderLeft: '4px solid var(--mantine-color-yellow-5)' }}>
                <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
                  Disclaimer: This is an AI-generated document. Clinician validation and editing is necessary before use. Diagnostic codes such as ICD-10, DSM-5 and other suggestions are not a diagnosis and must be verified by the clinician.
                </Text>
              </Paper>
            )}
          </Stack>
        </Paper>

        <Stack gap="md">
          {composition?.section?.map((section, index) => {
            const sectionTitle = section.title || '';
            const sectionText = editedSections[sectionTitle] || '';
            const isModified = modifiedSections.has(sectionTitle);
            const isTranscript = TRANSCRIPT_TITLES.some(title => 
              sectionTitle.toLowerCase().includes(title)
            );
            
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
                    <Title order={3} c="blue.8">
                      {sectionTitle}
                    </Title>
                    <Group gap="xs">
                      <Button
                        onClick={() => handleCopySection(sectionText, sectionTitle)}
                        variant={justCopied === sectionTitle ? "filled" : "light"}
                        color={justCopied === sectionTitle ? "teal" : "blue"}
                        size="xs"
                        leftSection={justCopied === sectionTitle ? <IconCheck size={14} /> : <IconCopy size={14} />}
                        styles={(theme) => ({
                          root: {
                            transition: 'all 200ms ease',
                            '&:hover': {
                              transform: 'translateY(-1px)'
                            }
                          }
                        })}
                      >
                        {justCopied === sectionTitle ? "Copied!" : "Copy"}
                      </Button>
                      <Button
                        onClick={() => setIsTranscriptVisible(false)}
                        variant="subtle"
                        size="xs"
                        styles={(theme) => ({
                          root: {
                            transition: 'all 200ms ease',
                            '&:hover': {
                              transform: 'translateY(-1px)'
                            }
                          }
                        })}
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
                    styles={{
                      input: {
                        '&:focus': {
                          outline: 'none',
                          border: '2px solid var(--mantine-color-blue-filled)',
                          boxShadow: '0 0 0 3px var(--mantine-color-blue-light)'
                        }
                      }
                    }}
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
                  <Title order={3} c="blue.8">
                    {sectionTitle}
                  </Title>
                  <Group gap={8}>
                    <Tooltip label="Magic Edit">
                      <ActionIcon
                        onClick={() => {
                          setCurrentSection(sectionTitle);
                          setShowMagicModal(true);
                        }}
                        variant="light"
                        color="violet"
                        size="sm"
                        disabled={!!composition?.attester?.[0]}
                        styles={(theme) => ({
                          root: {
                            transition: 'all 200ms ease',
                            '&:hover': {
                              transform: 'translateY(-1px)',
                              backgroundColor: theme.colors.violet[1]
                            }
                          }
                        })}
                      >
                        <IconWand size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Button
                      onClick={() => handleCopySection(sectionText, sectionTitle)}
                      variant={justCopied === sectionTitle ? "filled" : "light"}
                      color={justCopied === sectionTitle ? "teal" : "blue"}
                      size="xs"
                      leftSection={justCopied === sectionTitle ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      styles={(theme) => ({
                        root: {
                          transition: 'all 200ms ease',
                          '&:hover': {
                            transform: 'translateY(-1px)'
                          }
                        }
                      })}
                    >
                      {justCopied === sectionTitle ? "Copied!" : "Copy"}
                    </Button>
                    {isModified && (
                      <Button
                        onClick={() => handleSaveSection(sectionTitle)}
                        variant="light"
                        color="blue"
                        size="xs"
                        leftSection={<IconEdit size={14} />}
                        styles={(theme) => ({
                          root: {
                            transition: 'all 200ms ease',
                            '&:hover': {
                              transform: 'translateY(-1px)'
                            }
                          }
                        })}
                      >
                        Save Changes
                      </Button>
                    )}
                    {sectionTitle === 'Psychotherapy Note' && !composition?.attester?.[0] && (
                      <Button
                        onClick={handleRegenerate}
                        variant="light"
                        color="blue"
                        size="xs"
                        leftSection={<IconRefresh size={14} />}
                        styles={(theme) => ({
                          root: {
                            transition: 'all 200ms ease',
                            '&:hover': {
                              transform: 'translateY(-1px)'
                            }
                          }
                        })}
                      >
                        Regenerate Note
                      </Button>
                    )}
                  </Group>
                </Group>

                <Text size="sm" c="dimmed" mb="md" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Last modified: {new Date(sectionTimestamps[sectionTitle] || composition?.date || '').toLocaleString()}
                  {composition?.attester?.[0] && <IconLock size={14} />}
                </Text>

                <Textarea
                  value={sectionText}
                  onChange={(e) => handleTextChange(sectionTitle, e.target.value)}
                  minRows={5}
                  autosize
                  readOnly={!!composition?.attester?.[0]}
                  styles={{
                    input: {
                      '&:focus': {
                        outline: 'none',
                        border: '2px solid var(--mantine-color-blue-filled)',
                        boxShadow: '0 0 0 3px var(--mantine-color-blue-light)'
                      }
                    }
                  }}
                />
              </Paper>
            );
          })}
        </Stack>

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