import { Composition } from '@medplum/fhirtypes';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Box, Container, Text, Title, Textarea, Button, Group, Modal, Paper, Stack, Divider, Collapse, Tooltip, ActionIcon } from '@mantine/core';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { IconWand, IconCopy, IconCheck, IconEdit, IconBook } from '@tabler/icons-react';

export function NoteView(): JSX.Element {
  const { id } = useParams();
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const [composition, setComposition] = useState<Composition>();
  const [error, setError] = useState<string>();
  const [editedSections, setEditedSections] = useState<{ [key: string]: string }>({});
  const [modifiedSections, setModifiedSections] = useState<Set<string>>(new Set());
  const [showMagicModal, setShowMagicModal] = useState(false);
  const [magicInstructions, setMagicInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscriptVisible, setIsTranscriptVisible] = useState(false);
  const [justCopied, setJustCopied] = useState<string>('');

  useEffect(() => {
    if (id) {
      medplum.readResource('Composition', id)
        .then(comp => {
          const authorRef = comp.author?.[0]?.reference;
          const profileRef = `Practitioner/${profile?.id}`;
          
          if (authorRef === profileRef) {
            setComposition(comp);
            const sections: { [key: string]: string } = {};
            comp.section?.forEach((section) => {
              sections[section.title || ''] = section.text?.div?.replace(/<[^>]*>/g, '') || '';
            });
            setEditedSections(sections);
          } else {
            setError('You do not have permission to view this composition');
          }
        })
        .catch(err => setError('Error loading composition'));
    }
  }, [medplum, id, profile]);

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
      await medplum.updateResource(updatedComposition);
      setComposition(updatedComposition);
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
        setShowMagicModal(false);
      }
    } catch (err) {
      setError('Error processing magic edit');
    } finally {
      setIsProcessing(false);
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
      <Stack spacing="lg">
        <Paper p="xl" radius="md" withBorder>
          <Title order={2} mb="lg">
            Session Notes
          </Title>
          <Text size="sm" color="dimmed" mb="xl">
            {new Date(composition?.date || '').toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}
          </Text>
          
          {composition?.section?.map((section, index, array) => (
            <>
              {section.title === 'Transcript' && (
                <Text 
                  align="center" 
                  size="lg" 
                  weight={500} 
                  mb="lg"
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setIsTranscriptVisible(!isTranscriptVisible)}
                >
                  View Full Transcript
                </Text>
              )}
              {section.title === 'Transcript' ? (
                <Collapse in={isTranscriptVisible}>
                  <Paper key={index} withBorder p="md" radius="md" mb="lg">
                    <Group position="apart" mb="md">
                      <Title order={3} size="h4">
                        {section.title}
                      </Title>
                      <Group spacing="xs">
                        <Button
                          onClick={() => 
                            modifiedSections.has(section.title || '') 
                              ? handleSaveSection(section.title || '')
                              : handleCopySection(editedSections[section.title || ''], section.title || '')
                          }
                          variant={modifiedSections.has(section.title || '') ? "filled" : "light"}
                          color={modifiedSections.has(section.title || '') ? "blue" : justCopied === section.title ? "teal" : "violet"}
                          size="sm"
                          leftIcon={
                            modifiedSections.has(section.title || '') 
                              ? <IconCheck size={16} /> 
                              : justCopied === section.title 
                                ? <IconCheck size={16} /> 
                                : <IconCopy size={16} />
                          }
                          sx={(theme) => ({
                            backgroundColor: modifiedSections.has(section.title || '') 
                              ? theme.colors.blue[6]
                              : justCopied === section.title 
                                ? theme.colors.teal[1]
                                : theme.colors.violet[1],
                            color: justCopied === section.title 
                              ? theme.colors.teal[7]
                              : modifiedSections.has(section.title || '')
                                ? theme.white
                                : theme.colors.violet[9],
                            '&:hover': {
                              backgroundColor: modifiedSections.has(section.title || '')
                                ? theme.colors.blue[7]
                                : justCopied === section.title
                                  ? theme.colors.teal[2]
                                  : theme.colors.violet[2]
                            }
                          })}
                        >
                          {modifiedSections.has(section.title || '') 
                            ? 'Save Changes' 
                            : justCopied === section.title 
                              ? 'Copied!' 
                              : 'Copy Text'}
                        </Button>
                      </Group>
                    </Group>
                    <Box mb={8}>
                      <Text size="sm" color="dimmed" sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <IconEdit size={14} />
                        Click inside to edit
                      </Text>
                    </Box>
                    <Textarea
                      value={editedSections[section.title || '']}
                      onChange={(e) => handleTextChange(section.title || '', e.currentTarget.value)}
                      minRows={5}
                      autosize
                      styles={(theme) => ({
                        root: {
                          '&:hover': {
                            '.mantine-Textarea-input': {
                              backgroundColor: theme.colors.gray[0],
                              borderColor: theme.colors.blue[4]
                            }
                          }
                        },
                        input: {
                          backgroundColor: theme.white,
                          border: `1px solid ${theme.colors.gray[2]}`,
                          transition: 'all 200ms ease',
                          '&:focus': {
                            borderColor: theme.colors.blue[5],
                            backgroundColor: theme.white
                          }
                        }
                      })}
                    />
                  </Paper>
                </Collapse>
              ) : (
                <Paper 
                  key={index} 
                  withBorder 
                  p="md" 
                  radius="md" 
                  mb="lg"
                  sx={(theme) => ({
                    borderColor: theme.colors.gray[2],
                    backgroundColor: theme.white,
                    transition: 'all 200ms ease',
                    '&:hover': {
                      borderColor: theme.colors.blue[4],
                      backgroundColor: theme.colors.gray[0]
                    },
                    '&:focus-within': {
                      borderColor: theme.colors.blue[5]
                    }
                  })}
                >
                  <Group position="apart" mb="md">
                    <Title order={3} size="h4">
                      {section.title}
                    </Title>
                    <Group spacing="xs">
                      {section.title === 'Psychotherapy Note' && (
                        <Tooltip label="Magic Edit">
                          <ActionIcon
                            onClick={() => setShowMagicModal(true)}
                            variant="light"
                            color="violet"
                            size="lg"
                            sx={(theme) => ({
                              '&:hover': {
                                backgroundColor: theme.colors.violet[1]
                              }
                            })}
                          >
                            <IconWand size={20} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      <Button
                        onClick={() => 
                          modifiedSections.has(section.title || '') 
                            ? handleSaveSection(section.title || '')
                            : handleCopySection(editedSections[section.title || ''], section.title || '')
                        }
                        variant={modifiedSections.has(section.title || '') ? "filled" : "light"}
                        color={modifiedSections.has(section.title || '') ? "blue" : justCopied === section.title ? "teal" : "violet"}
                        size="sm"
                        leftIcon={
                          modifiedSections.has(section.title || '') 
                            ? <IconCheck size={16} /> 
                            : justCopied === section.title 
                              ? <IconCheck size={16} /> 
                              : <IconCopy size={16} />
                        }
                        sx={(theme) => ({
                          backgroundColor: modifiedSections.has(section.title || '') 
                            ? theme.colors.blue[6]
                            : justCopied === section.title 
                              ? theme.colors.teal[1]
                              : theme.colors.violet[1],
                          color: justCopied === section.title 
                            ? theme.colors.teal[7]
                            : modifiedSections.has(section.title || '')
                              ? theme.white
                              : theme.colors.violet[9],
                          '&:hover': {
                            backgroundColor: modifiedSections.has(section.title || '')
                              ? theme.colors.blue[7]
                              : justCopied === section.title
                                ? theme.colors.teal[2]
                                : theme.colors.violet[2]
                          }
                        })}
                      >
                        {modifiedSections.has(section.title || '') 
                          ? 'Save Changes' 
                          : justCopied === section.title 
                            ? 'Copied!' 
                            : 'Copy Text'}
                      </Button>
                    </Group>
                  </Group>
                  <Box mb={8}>
                    <Text size="sm" color="dimmed" sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconEdit size={14} />
                      Click inside to edit
                    </Text>
                  </Box>
                  <Textarea
                    value={editedSections[section.title || '']}
                    onChange={(e) => handleTextChange(section.title || '', e.currentTarget.value)}
                    minRows={5}
                    autosize
                    styles={(theme) => ({
                      root: {
                        '&:hover': {
                          '.mantine-Textarea-input': {
                            backgroundColor: theme.colors.gray[0],
                            borderColor: theme.colors.blue[4]
                          }
                        }
                      },
                      input: {
                        backgroundColor: theme.white,
                        border: `1px solid ${theme.colors.gray[2]}`,
                        transition: 'all 200ms ease',
                        '&:focus': {
                          borderColor: theme.colors.blue[5],
                          backgroundColor: theme.white
                        }
                      }
                    })}
                  />
                </Paper>
              )}
            </>
          ))}
        </Paper>

        <Modal
          opened={showMagicModal}
          onClose={() => setShowMagicModal(false)}
          title={<Title order={3}>Magic Edit - Psychotherapy Note</Title>}
          size="lg"
        >
          <Stack spacing="md">
            <Textarea
              label="Edit Instructions"
              description="Describe how you want to modify the note"
              placeholder="e.g., 'Expand on the client's attachment patterns' or 'Add more detail about treatment progress'"
              value={magicInstructions}
              onChange={(e) => setMagicInstructions(e.currentTarget.value)}
              minRows={3}
              autosize
              styles={(theme) => ({
                input: {
                  backgroundColor: theme.colors.gray[0]
                }
              })}
            />
            <Group position="right">
              <Button 
                onClick={() => setShowMagicModal(false)}
                variant="subtle"
                color="gray"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleMagicEdit('Psychotherapy Note')}
                loading={isProcessing}
                color="violet"
              >
                Apply Magic Edit
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}